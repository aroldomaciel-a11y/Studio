import React, { useState } from 'react';
import { Apple, Smartphone, Wifi, Cable, Layers, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

export const BandLabGuide: React.FC = () => {
  const [activePlatform, setActivePlatform] = useState<'ios' | 'android' | 'network'>('ios');

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      {/* Title */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Layers className="w-5 h-5 text-amber-400" />
          <h1 className="text-lg font-bold text-neutral-100">
            Guia de Integração MixLink com BandLab
          </h1>
        </div>
        <p className="text-xs text-neutral-400">
          Como rotear áudio em tempo real com baixa latência no iOS (AUv3) e Android (Loopback / Interface)
        </p>

        {/* Platform Selector Buttons */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => setActivePlatform('ios')}
            className={`min-h-[40px] px-4 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              activePlatform === 'ios'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            <Apple className="w-4 h-4" />
            <span>iOS / iPadOS (AUv3 sem cabos)</span>
          </button>
          <button
            onClick={() => setActivePlatform('android')}
            className={`min-h-[40px] px-4 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              activePlatform === 'android'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Android (Loopback & Interface OTG)</span>
          </button>
          <button
            onClick={() => setActivePlatform('network')}
            className={`min-h-[40px] px-4 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              activePlatform === 'network'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            <Wifi className="w-4 h-4" />
            <span>Configuração Wi-Fi 5 GHz</span>
          </button>
        </div>
      </div>

      {/* iOS AUv3 Guide */}
      {activePlatform === 'ios' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center gap-3 pb-4 border-b border-neutral-800">
            <div className="p-2.5 rounded-xl bg-neutral-800 text-amber-400">
              <Apple className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-100">
                Integração iOS: Audio Unit Extension (AUv3)
              </h2>
              <p className="text-xs text-neutral-400">
                Permite puxar o áudio do BandLab diretamente pela memória do iOS, sem nenhum cabo físico e com latência imperceptível (&lt; 3 ms de captura).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl flex flex-col gap-2">
              <span className="text-amber-400 font-mono text-xs font-bold">Passo 1</span>
              <h3 className="text-sm font-semibold text-neutral-200">Abra o BandLab no iPad/iPhone</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                No projeto do BandLab, abra o mixer de faixas. Certifique-se de que os instrumentos estejam agrupados nos 4 canais de saída ou sub-buses (Bateria, Baixo, Guitarras, Voz/Teclas).
              </p>
            </div>

            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl flex flex-col gap-2">
              <span className="text-amber-400 font-mono text-xs font-bold">Passo 2</span>
              <h3 className="text-sm font-semibold text-neutral-200">Inserir Plugin AUv3 MixLink</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                No slot de efeitos da trilha Master ou dos Sub-Buses, toque em <strong>+ Efeito &gt; Audio Units</strong> e selecione <strong>MixLink Monitor Transmitter</strong>.
              </p>
            </div>

            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl flex flex-col gap-2">
              <span className="text-amber-400 font-mono text-xs font-bold">Passo 3</span>
              <h3 className="text-sm font-semibold text-neutral-200">Inicie o MixLink Server</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                O plugin AUv3 passa o áudio direto para o processo do MixLink via ring buffer compartilhado (CoreAudio IOProc). O servidor gera o QR Code e começa o broadcast 5GHz.
              </p>
            </div>
          </div>

          <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-xs text-emerald-300 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <div>
              <strong>Vantagem do AUv3 no iOS:</strong> Sem conversão D/A e A/D repetida, zero ruído de cabos, fidelidade de 48 kHz / 24-bit e latência de processamento de apenas 128 samples (~2.6 milissegundos).
            </div>
          </div>
        </div>
      )}

      {/* Android Guide */}
      {activePlatform === 'android' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center gap-3 pb-4 border-b border-neutral-800">
            <div className="p-2.5 rounded-xl bg-neutral-800 text-amber-400">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-100">
                Integração Android: Loopback do Sistema & Interface OTG
              </h2>
              <p className="text-xs text-neutral-400">
                Opções para captura de áudio direto do BandLab no Android usando Oboe / AAudio.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Option A: Digital Loopback */}
            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                  Opção A (100% Digital)
                </span>
                <h3 className="text-sm font-semibold text-neutral-200">
                  AudioPlaybackCapture API (Android 10+)
                </h3>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed mb-3">
                O módulo nativo em Kotlin utiliza a API <code className="text-amber-300">AudioPlaybackCaptureConfiguration</code>. O app solicita permissão de captura de mídia ao usuário e intercepta os canais de áudio gerados pelo BandLab no próprio dispositivo sem precisar de cabo.
              </p>
              <div className="text-[11px] font-mono text-neutral-400 bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
                MediaProjectionManager -&gt; AudioRecord.Builder() -&gt; AAudio Stream (EXCLUSIVE mode) -&gt; Opus Encoder
              </div>
            </div>

            {/* Option B: Hardware Interface */}
            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                  Opção B (Hardware)
                </span>
                <h3 className="text-sm font-semibold text-neutral-200">
                  Interface de Áudio USB OTG / Cabo P2 Line-In
                </h3>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed mb-2">
                Se o Android estiver em versão anterior ou a ROM bloquear loopback de mídia:
              </p>
              <ol className="list-decimal list-inside text-xs text-neutral-400 space-y-1.5 pl-1">
                <li>Conecte uma interface USB class-compliant (ex: Behringer UMC404HD, Focusrite Scarlett 4i4) via adaptador USB-C OTG no dispositivo servidor.</li>
                <li>Ligue as saídas auxiliares ou de fone da mesa de som / notebook com BandLab nas 4 entradas da interface.</li>
                <li>O MixLink detecta as 4 entradas analógicas como os 4 canais separados e transmite via Wi-Fi 5 GHz.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Network Setup Guide */}
      {activePlatform === 'network' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center gap-3 pb-4 border-b border-neutral-800">
            <div className="p-2.5 rounded-xl bg-neutral-800 text-amber-400">
              <Wifi className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-100">
                Configuração da Rede Wi-Fi 5 GHz (Para Latência &lt; 35 ms)
              </h2>
              <p className="text-xs text-neutral-400">
                Recomendações técnicas para garantir estabilidade máxima no palco ou estúdio de ensaio.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl flex flex-col gap-2">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                1. Roteador Dedicado no Palco
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Use um roteador Wi-Fi 5 GHz (Wi-Fi 5 / Wi-Fi 6) dedicado para a banda. Não use o Wi-Fi público do bar ou igreja para evitar congestionamento de banda.
              </p>
            </div>

            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl flex flex-col gap-2">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                2. Largura de Canal & Canal Fixo
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Configure a banda 5 GHz com largura de canal de <strong>40 MHz ou 80 MHz</strong> em um canal DFS limpo (ex: canais 36, 40 ou 149). Desative o &quot;Band Steering&quot; para os celulares não caírem acidentalmente em 2.4 GHz.
              </p>
            </div>

            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl flex flex-col gap-2">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                3. Desativar Isolamento de AP (AP Isolation)
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                O isolamento de clientes (Client Isolation) precisa estar <strong>DESATIVADO</strong> para que os celulares dos músicos possam enxergar o IP do servidor na rede local sem passar por roteamento externo.
              </p>
            </div>

            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl flex flex-col gap-2">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                4. Ativar WMM / QoS
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Ative o <strong>Wi-Fi Multimedia (WMM)</strong> para que os pacotes UDP RTP de áudio do WebRTC recebam prioridade de transmissão (Voice Priority - AC_VO), eliminando jitter e drops.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
