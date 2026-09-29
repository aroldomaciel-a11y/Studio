import React, { useState, useEffect } from 'react';
import {
  Radio,
  Disc,
  Download,
  Wifi,
  Users,
  Settings2,
  Sparkles,
  Mic,
  Activity,
  Layers,
  StopCircle,
} from 'lucide-react';
import { ServerState, MusicianProfile, StemId } from '../../types/mixlink';
import { StemLevels, audioEngine } from '../../audio/AudioEngine';
import { VUMeter } from '../common/VUMeter';
import { QRCodeDisplay } from './QRCodeDisplay';

interface ServerDashboardProps {
  serverState: ServerState;
  onUpdateServerState: (updated: Partial<ServerState>) => void;
  musicians: MusicianProfile[];
  levels: StemLevels;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export const ServerDashboard: React.FC<ServerDashboardProps> = ({
  serverState,
  onUpdateServerState,
  musicians,
  levels,
  isPlaying,
  onTogglePlay,
}) => {
  const [recordTimer, setRecordTimer] = useState<number>(0);
  const [recordedDownloadUrl, setRecordedDownloadUrl] = useState<string | null>(null);

  // Recording timer
  useEffect(() => {
    let interval: number;
    if (serverState.isRecording) {
      interval = window.setInterval(() => {
        setRecordTimer((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordTimer(0);
    }
    return () => clearInterval(interval);
  }, [serverState.isRecording]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = () => {
    const success = audioEngine.startSafetyRecording((blob) => {
      const url = URL.createObjectURL(blob);
      setRecordedDownloadUrl(url);
      onUpdateServerState({
        isRecording: false,
        recordedBlobUrl: url,
        recordedSizeMb: Number((blob.size / (1024 * 1024)).toFixed(2)),
      });
    });

    if (success) {
      onUpdateServerState({ isRecording: true });
    }
  };

  const handleStopRecording = () => {
    audioEngine.stopSafetyRecording();
    onUpdateServerState({ isRecording: false });
  };

  const handleSourceChange = (src: ServerState['audioSource']) => {
    audioEngine.setAudioSource(src);
    onUpdateServerState({ audioSource: src });
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      {/* Server Header & Broadcast State */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-neutral-100">
                MixLink Server (Host de Retorno)
              </h1>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                BROADCAST ATIVO (4 CANAIS)
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Transmitindo 4 stems via WebRTC RTP Opus 48 kHz para até 4 músicos simultâneos
            </p>
            <div className="flex items-center gap-3 text-xs text-neutral-400 mt-2 font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <Wifi className="w-3.5 h-3.5" />
                <span>Wi-Fi 5 GHz LAN:</span>
                <strong className="text-neutral-200">{serverState.lanIp}:{serverState.port}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>PIN: <strong className="text-amber-400">{serverState.pinCode}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Buffer: 128 samples (~2.6ms)</span>
            </div>
          </div>
        </div>

        {/* Server Actions & Source Picker */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Source dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs">
            <span className="text-neutral-400">Fonte:</span>
            <select
              value={serverState.audioSource}
              onChange={(e) => handleSourceChange(e.target.value as ServerState['audioSource'])}
              className="bg-transparent text-neutral-200 font-medium outline-none cursor-pointer text-xs"
            >
              <option value="simulated_stems" className="bg-neutral-900 text-neutral-200">
                Stems Sintetizados (Bateria, Baixo, Guitarra, Vocal)
              </option>
              <option value="bandlab_auv3" className="bg-neutral-900 text-neutral-200">
                BandLab AUv3 Extension (iOS Direct Bus)
              </option>
              <option value="system_loopback" className="bg-neutral-900 text-neutral-200">
                Loopback de Áudio do Sistema (Android / PC)
              </option>
              <option value="mic_input" className="bg-neutral-900 text-neutral-200">
                Entrada Microfone / Interface Física
              </option>
            </select>
          </div>

          {/* Test Sound button */}
          <button
            type="button"
            onClick={onTogglePlay}
            className={`min-h-[40px] px-4 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              isPlaying
                ? 'bg-red-600/90 hover:bg-red-700 text-white shadow-md'
                : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md'
            }`}
          >
            {isPlaying ? (
              <>
                <StopCircle className="w-4 h-4" />
                <span>Parar Áudio</span>
              </>
            ) : (
              <>
                <Radio className="w-4 h-4" />
                <span>Testar Transmissão</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4 Input Stems Hardware Meters Grid */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-neutral-200 uppercase tracking-wider">
              Níveis de Entrada dos 4 Stems (dBFS)
            </h2>
          </div>
          <span className="text-xs text-neutral-400 font-mono">
            48.000 Hz · 24-bit PCM · Opus 64 kbps/ch
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Stem 1: Bateria */}
          <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400">1. Bateria</span>
              <span className="text-[10px] text-neutral-400 font-mono">CH 1-2</span>
            </div>
            <VUMeter peak={levels.drums.peak} rms={levels.drums.rms} orientation="horizontal" />
            <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-1">
              <span>Kick / Snare / Hats</span>
              <span className="font-mono text-neutral-300">
                {levels.drums.peak > 0.01 ? `${(20 * Math.log10(levels.drums.peak)).toFixed(1)} dB` : '-∞'}
              </span>
            </div>
          </div>

          {/* Stem 2: Baixo */}
          <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-cyan-400">2. Baixo</span>
              <span className="text-[10px] text-neutral-400 font-mono">CH 3</span>
            </div>
            <VUMeter peak={levels.bass.peak} rms={levels.bass.rms} orientation="horizontal" />
            <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-1">
              <span>Sub / Bassline</span>
              <span className="font-mono text-neutral-300">
                {levels.bass.peak > 0.01 ? `${(20 * Math.log10(levels.bass.peak)).toFixed(1)} dB` : '-∞'}
              </span>
            </div>
          </div>

          {/* Stem 3: Guitarras */}
          <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400">3. Guitarras</span>
              <span className="text-[10px] text-neutral-400 font-mono">CH 4-5</span>
            </div>
            <VUMeter peak={levels.guitars.peak} rms={levels.guitars.rms} orientation="horizontal" />
            <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-1">
              <span>Rhythm & Solo</span>
              <span className="font-mono text-neutral-300">
                {levels.guitars.peak > 0.01 ? `${(20 * Math.log10(levels.guitars.peak)).toFixed(1)} dB` : '-∞'}
              </span>
            </div>
          </div>

          {/* Stem 4: Vocal & Teclado */}
          <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-violet-400">4. Vocal & Teclado</span>
              <span className="text-[10px] text-neutral-400 font-mono">CH 6-7</span>
            </div>
            <VUMeter peak={levels.vocals_keys.peak} rms={levels.vocals_keys.rms} orientation="horizontal" />
            <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-1">
              <span>Voz Principal + Rhodes</span>
              <span className="font-mono text-neutral-300">
                {levels.vocals_keys.peak > 0.01 ? `${(20 * Math.log10(levels.vocals_keys.peak)).toFixed(1)} dB` : '-∞'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Connected Musicians + Safety Recorder + QR Code */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Connected Musicians Status (Up to 4) */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-neutral-200">
                Músicos Conectados ({musicians.filter((m) => m.connected).length} de 4)
              </h2>
            </div>
            <span className="text-xs text-neutral-400">
              Slots de mixagem independentes
            </span>
          </div>

          <div className="space-y-3">
            {musicians.map((m) => (
              <div
                key={m.id}
                className="p-3.5 bg-neutral-950 border border-neutral-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-neutral-700 transition-colors"
              >
                {/* Musician avatar & name */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-md"
                    style={{ backgroundColor: m.avatarColor }}
                  >
                    M{m.slot}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-neutral-100">{m.name}</span>
                      <span className="text-xs text-neutral-400">({m.instrument})</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400 font-mono mt-0.5">
                      <span>{m.ipAddress}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-neutral-400">{m.audioOutput.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                {/* Telemetry info: Latency, Jitter, Battery */}
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-neutral-400 uppercase">Latência</span>
                    <span className="text-emerald-400 font-semibold">{m.latencyMs} ms</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-neutral-400 uppercase">Jitter</span>
                    <span className="text-neutral-300">{m.jitterMs} ms</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-neutral-400 uppercase">Bateria</span>
                    <span className="text-neutral-300">{m.batteryPercent}%</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-neutral-400 uppercase">Sinal</span>
                    <span className="text-emerald-400">{m.wifiSignalDbm} dBm</span>
                  </div>
                  <div className="pl-1">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        m.connected ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-neutral-600'
                      }`}
                      title={m.connected ? 'Conectado em tempo real' : 'Desconectado'}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Safety WAV Recording Section */}
          <div className="mt-2 p-4 bg-neutral-950 border border-neutral-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-lg ${
                  serverState.isRecording
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                    : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                }`}
              >
                <Disc className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-200">
                    Gravação de Segurança (WAV 48 kHz / 24-bit)
                  </span>
                  {serverState.isRecording && (
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-red-600 text-white font-bold rounded animate-pulse">
                      REC {formatTimer(recordTimer)}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400">
                  Gera arquivo WAV de backup em caso de necessidade de pós-produção ou análise de ensaio
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {serverState.isRecording ? (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="min-h-[38px] px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-md"
                >
                  <StopCircle className="w-4 h-4" />
                  <span>Parar Gravação</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  className="min-h-[38px] px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg border border-neutral-700 flex items-center gap-1.5 transition-colors"
                >
                  <Disc className="w-4 h-4 text-red-500" />
                  <span>Iniciar Gravação WAV</span>
                </button>
              )}

              {recordedDownloadUrl && (
                <a
                  href={recordedDownloadUrl}
                  download="MixLink_Safety_Recording_48k.wav"
                  className="min-h-[38px] px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar WAV ({serverState.recordedSizeMb} MB)</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: QR Code Card & Latency Budget Info */}
        <div className="flex flex-col gap-4">
          <QRCodeDisplay
            pinCode={serverState.pinCode}
            lanIp={serverState.lanIp}
            port={serverState.port}
          />

          {/* Latency Budget Breakdown Card */}
          <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-200">
                Orçamento de Latência Fim-a-Fim
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                ~23.6 ms total
              </span>
            </div>

            <div className="space-y-1.5 text-[11px] text-neutral-400 font-mono">
              <div className="flex justify-between">
                <span>Captura BandLab / Loopback:</span>
                <span className="text-neutral-300">2.6 ms (128 spl)</span>
              </div>
              <div className="flex justify-between">
                <span>Codificação Opus 48 kHz:</span>
                <span className="text-neutral-300">5.0 ms</span>
              </div>
              <div className="flex justify-between">
                <span>Wi-Fi 5 GHz LAN (RTP/UDP):</span>
                <span className="text-neutral-300">8.2 ms</span>
              </div>
              <div className="flex justify-between">
                <span>Decodificação Cliente:</span>
                <span className="text-neutral-300">4.5 ms</span>
              </div>
              <div className="flex justify-between">
                <span>Jitter Buffer adaptativo:</span>
                <span className="text-neutral-300">3.3 ms</span>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
              <span>Meta estabelecida:</span>
              <span className="text-amber-400 font-semibold">&lt; 35 ms (Cumprida)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
