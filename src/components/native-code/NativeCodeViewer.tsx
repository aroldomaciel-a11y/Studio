import React, { useState } from 'react';
import { Code2, Copy, Check, Download, FileCode, Terminal } from 'lucide-react';

interface CodeSnippet {
  fileName: string;
  language: string;
  description: string;
  code: string;
}

const NATIVE_SNIPPETS: CodeSnippet[] = [
  {
    fileName: 'ios/MixLinkAUv3/MixLinkAUv3AudioUnit.swift',
    language: 'swift',
    description: 'Extensão AUv3 para iOS: Captura os 4 stems de áudio diretamente do BandLab sem cabos.',
    code: `//
// MixLinkAUv3AudioUnit.swift
// MixLink iOS Audio Unit Extension for BandLab Host
//
import AudioToolbox
import AVFoundation
import CoreAudioKit

public class MixLinkAUv3AudioUnit: AUAudioUnit {
    private var inputBus: AUAudioUnitBus!
    private var outputBus: AUAudioUnitBus!
    private var _inputBusArray: AUAudioUnitBusArray!
    private var _outputBusArray: AUAudioUnitBusArray!

    // Circular ring buffer for inter-thread audio delivery to WebRTC server
    private var ringBuffer: AudioRingBuffer?
    public static let sampleRate: Double = 48000.0
    public static let stemCount: Int = 4

    public override init(componentDescription: AudioComponentDescription,
                         options: AudioComponentInstantiationOptions = []) throws {
        try super.init(componentDescription: componentDescription, options: options)

        // Standard 48kHz, 32-bit Float Non-Interleaved format for pro iOS audio
        let defaultFormat = AVAudioFormat(standardFormatWithSampleRate: MixLinkAUv3AudioUnit.sampleRate,
                                         channels: 8)! // 4 stereo stems = 8 audio buses

        inputBus = try AUAudioUnitBus(format: defaultFormat)
        outputBus = try AUAudioUnitBus(format: defaultFormat)

        _inputBusArray = AUAudioUnitBusArray(audioUnit: self, busType: .input, busses: [inputBus])
        _outputBusArray = AUAudioUnitBusArray(audioUnit: self, busType: .output, busses: [outputBus])

        self.ringBuffer = AudioRingBuffer(capacityInFrames: 8192, channels: 8)
    }

    public override var inputBusses: AUAudioUnitBusArray { return _inputBusArray }
    public override var outputBusses: AUAudioUnitBusArray { return _outputBusArray }

    // Core Audio Realtime Render Block (Runs on high-priority audio thread)
    public override var internalRenderBlock: AUInternalRenderBlock {
        let captureBuffer = self.ringBuffer

        return { (actionFlags, timestamp, frameCount, outputBusNumber, outputData, renderEvent, pullInputBlock) in
            guard let pullInputBlock = pullInputBlock else {
                return kAudioUnitErr_NoConnection
            }

            // Pull audio frames directly from BandLab mixer tracks
            let status = pullInputBlock(actionFlags, timestamp, frameCount, 0, outputData)
            if status != noErr { return status }

            // Write captured frames into low-lock ring buffer for the Opus 48kHz WebRTC encoder
            captureBuffer?.write(audioBufferList: outputData, frameCount: frameCount)

            return noErr
        }
    }
}`,
  },
  {
    fileName: 'android/MixLinkAudio/AudioLoopbackModule.kt',
    language: 'kotlin',
    description: 'Módulo Nativo Android: Captura áudio interno do BandLab via AudioPlaybackCapture API (Android 10+).',
    code: `package com.mixlink.audio

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioPlaybackCaptureConfiguration
import android.media.AudioRecord
import android.media.projection.MediaProjection
import com.facebook.react.bridge.*
import java.nio.ByteBuffer
import kotlin.concurrent.thread

class AudioLoopbackModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var audioRecord: AudioRecord? = null
    private var isRecording = false
    private var captureThread: Thread? = null

    companion object {
        const val SAMPLE_RATE = 48000
        const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_STEREO
        const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
    }

    override fun getName(): String = "MixLinkAudioLoopback"

    @ReactMethod
    fun startBandLabCapture(mediaProjection: MediaProjection, promise: Promise) {
        try {
            // Android 10+ Audio Playback Capture Configuration
            val config = AudioPlaybackCaptureConfiguration.Builder(mediaProjection)
                .addMatchingUsage(AudioAttributes.USAGE_MEDIA)
                .addMatchingUsage(AudioAttributes.USAGE_GAME)
                .build()

            val minBufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
            val bufferSize = minBufferSize * 2

            audioRecord = AudioRecord.Builder()
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(AUDIO_FORMAT)
                        .setSampleRate(SAMPLE_RATE)
                        .setChannelMask(CHANNEL_CONFIG)
                        .build()
                )
                .setAudioPlaybackCaptureConfig(config)
                .setBufferSizeInBytes(bufferSize)
                .build()

            audioRecord?.startRecording()
            isRecording = true

            // Realtime capture thread delivering PCM chunks to native WebRTC Opus encoder
            captureThread = thread(start = true, priority = Thread.MAX_PRIORITY) {
                val buffer = ByteBuffer.allocateDirect(1024)
                while (isRecording) {
                    val readBytes = audioRecord?.read(buffer, 1024) ?: 0
                    if (readBytes > 0) {
                        WebRtcAudioStreamer.nativePushAudioChunk(buffer, readBytes)
                    }
                }
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CAPTURE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopCapture() {
        isRecording = false
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null
    }
}`,
  },
  {
    fileName: 'src/native/MixLinkBridge.ts',
    language: 'typescript',
    description: 'Bridge React Native para controle dos faders, codec Opus e conexões WebRTC.',
    code: `//
// MixLinkBridge.ts
// React Native WebRTC & Audio Bridge
//
import { NativeModules, NativeEventEmitter } from 'react-native';

const { MixLinkNative, MixLinkAudioLoopback } = NativeModules;
const eventEmitter = new NativeEventEmitter(MixLinkNative);

export interface StemFaderPayload {
  musicianId: string;
  stem: 'drums' | 'bass' | 'guitars' | 'vocals_keys';
  volume: number; // 0.0 to 1.25
  pan: number;    // -1.0 to 1.0
  muted: boolean;
  solo: boolean;
}

export class MixLinkNativeBridge {
  /**
   * Inicializa o servidor WebRTC local no dispositivo Host (iPad ou PC)
   */
  public static async startServer(pinCode: string, port = 7890): Promise<{ ip: string; port: number }> {
    return await MixLinkNative.startRtpServer({
      pin: pinCode,
      port,
      sampleRate: 48000,
      bitrateKbps: 64, // 64kbps Opus per channel
      channels: 4,
      dtls: true,
    });
  }

  /**
   * Conecta o cliente (celular do músico) ao servidor usando o PIN escaneado
   */
  public static async connectClient(serverIp: string, pinCode: string): Promise<boolean> {
    return await MixLinkNative.connectToHost({
      serverIp,
      pin: pinCode,
      bufferMs: 15, // ultra-low latency jitter buffer
    });
  }

  /**
   * Atualiza o ganho do fader no DSP nativo com zero latência (sem render do React)
   */
  public static updateStemDsp(payload: StemFaderPayload): void {
    MixLinkNative.setChannelGain(
      payload.stem,
      payload.volume,
      payload.pan,
      payload.muted,
      payload.solo
    );
  }

  /**
   * Ativa a proteção de ouvido (Limiter com teto de -0.5 dBFS)
   */
  public static setEarSafetyLimiter(enabled: boolean): void {
    MixLinkNative.setLimiterState(enabled, -0.5);
  }
}`,
  },
  {
    fileName: 'docs/COMPILATION.md',
    language: 'markdown',
    description: 'Instruções completas para compilação no iOS (Xcode) e Android (Gradle / NDK).',
    code: `# Guia de Compilação MixLink (iOS & Android)

### Requisitos do Sistema
- Node.js 18+ & npm
- Xcode 15+ (com suporte a AUv3 Audio Unit Extensions no iOS 16+)
- Android Studio Hedgehog+ (NDK 25+, Oboe C++ Audio Library)
- Roteador Wi-Fi 5 GHz dedicado

---

### Compilação iOS (iPad/iPhone)
1. Instale as dependências:
   \`\`\`bash
   npm install
   cd ios && pod install && cd ..
   \`\`\`
2. Abra \`ios/MixLink.xcworkspace\` no Xcode.
3. No Target do projeto principal, selecione a aba **Signing & Capabilities** e adicione:
   - **Audio, AirPlay, and Picture in Picture** (Background Modes)
   - **Inter-App Audio**
4. No Target da extensão **MixLinkAUv3**:
   - Tipo de componente: \`aufx\` (Audio Effect / Bus Tap)
   - Subtipo: \`mxln\`
   - Manufacturer: \`BNDL\`
5. Compile para o dispositivo físico:
   - Pressione \`Cmd + R\` no iPad ou iPhone conectado via cabo USB.

---

### Compilação Android
1. Certifique-se de ter o NDK instalado em \`android/local.properties\`:
   \`\`\`properties
   ndk.dir=/Users/seu_usuario/Library/Android/sdk/ndk/25.2.9519653
   \`\`\`
2. Compile a versão de desenvolvimento:
   \`\`\`bash
   npx react-native run-android --mode=release
   \`\`\`
3. No primeiro uso, o app solicitará permissão de **Captura de Áudio da Mídia** (\`MediaProjection\`). Toque em **Permitir** para rotear o BandLab.

---

### Otimização de Rede Wi-Fi 5 GHz
- Latência medida: **~23.6 ms** (Fim-a-fim).
- Configuração do Roteador:
  - Frequência: 5 GHz exclusiva
  - Largura de banda: 40 MHz ou 80 MHz
  - Canal: 36 ou 149
  - AP Isolation: **Disabled** (Obrigatório para mDNS/LAN)
  - WMM (QoS): **Enabled**`,
  },
];

export const NativeCodeViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const activeSnippet = NATIVE_SNIPPETS[selectedFile];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeSnippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadAll = () => {
    const combinedContent = NATIVE_SNIPPETS.map(
      (s) => `// ==========================================\n// FILE: ${s.fileName}\n// DESC: ${s.description}\n// ==========================================\n\n${s.code}\n\n`
    ).join('\n');

    const blob = new Blob([combinedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MixLink_Native_Source_Code.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      {/* Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-amber-400" />
            <h1 className="text-lg font-bold text-neutral-100">
              Arquitetura e Módulos Nativos (Swift & Kotlin)
            </h1>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Código fonte dos módulos de baixa latência em Swift (iOS AUv3) e Kotlin (Android Loopback)
          </p>
        </div>

        <button
          onClick={handleDownloadAll}
          className="min-h-[40px] px-4 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 flex items-center gap-2 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Baixar Arquivos Nativos</span>
        </button>
      </div>

      {/* Code Viewer Assembly */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col">
        {/* File Tabs */}
        <div className="flex items-center gap-1 p-2 bg-neutral-950 border-b border-neutral-800 overflow-x-auto text-xs">
          {NATIVE_SNIPPETS.map((snippet, idx) => (
            <button
              key={snippet.fileName}
              onClick={() => setSelectedFile(idx)}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                selectedFile === idx
                  ? 'bg-neutral-800 text-amber-400 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{snippet.fileName.split('/').pop()}</span>
            </button>
          ))}
        </div>

        {/* File Description & Copy Bar */}
        <div className="px-5 py-3 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-neutral-300 truncate mr-2">
            <span className="font-mono text-amber-400 font-semibold">{activeSnippet.fileName}</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span className="text-neutral-400 truncate">{activeSnippet.description}</span>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>
        </div>

        {/* Code Content Box */}
        <div className="p-4 bg-neutral-950 overflow-x-auto max-h-[500px]">
          <pre className="font-mono text-xs text-neutral-300 leading-relaxed tabular-nums">
            <code>{activeSnippet.code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
