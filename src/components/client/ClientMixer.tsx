import React, { useState, useEffect } from 'react';
import { RotateCcw, Headphones, Battery, Wifi, ShieldCheck, QrCode, RefreshCw, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { StemId, MusicianProfile } from '../../types/mixlink';
import { StemLevels, audioEngine } from '../../audio/AudioEngine';
import { Fader } from '../common/Fader';
import { LimiterDisplay } from '../common/LimiterDisplay';
import { QRScannerModal } from './QRScannerModal';

interface ClientMixerProps {
  musician: MusicianProfile;
  onUpdateMusician: (updated: MusicianProfile) => void;
  levels: StemLevels;
  serverPin: string;
  serverIp: string;
  serverRunning: boolean;
}

export const ClientMixer: React.FC<ClientMixerProps> = ({
  musician,
  onUpdateMusician,
  levels,
  serverPin,
  serverIp,
  serverRunning,
}) => {
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [activePreset, setActivePreset] = useState<string>('custom');

  // Check if any stem has solo active
  const anySoloActive = Object.values(musician.stems).some((s) => s.solo);

  // Sync state changes with audio engine when this musician is active
  useEffect(() => {
    // Update each stem
    (Object.keys(musician.stems) as StemId[]).forEach((id) => {
      audioEngine.updateStemMix(id, musician.stems[id], anySoloActive);
    });

    audioEngine.setMasterVolume(musician.masterVolume);
    audioEngine.setLimiterEnabled(musician.limiterActive);
    audioEngine.setStereoMode(musician.isStereo);
  }, [musician, anySoloActive]);

  // Handle stem volume change
  const handleStemVolumeChange = (stemId: StemId, vol: number) => {
    const updated = {
      ...musician,
      stems: {
        ...musician.stems,
        [stemId]: {
          ...musician.stems[stemId],
          volume: vol,
        },
      },
    };
    onUpdateMusician(updated);
    setActivePreset('custom');
  };

  // Handle pan change
  const handleStemPanChange = (stemId: StemId, pan: number) => {
    const updated = {
      ...musician,
      stems: {
        ...musician.stems,
        [stemId]: {
          ...musician.stems[stemId],
          pan,
        },
      },
    };
    onUpdateMusician(updated);
  };

  // Handle Mute
  const handleStemMuteToggle = (stemId: StemId) => {
    const updated = {
      ...musician,
      stems: {
        ...musician.stems,
        [stemId]: {
          ...musician.stems[stemId],
          muted: !musician.stems[stemId].muted,
        },
      },
    };
    onUpdateMusician(updated);
  };

  // Handle Solo
  const handleStemSoloToggle = (stemId: StemId) => {
    const updated = {
      ...musician,
      stems: {
        ...musician.stems,
        [stemId]: {
          ...musician.stems[stemId],
          solo: !musician.stems[stemId].solo,
        },
      },
    };
    onUpdateMusician(updated);
  };

  // Reset Mix
  const handleResetMix = () => {
    const resetStems = {
      drums: { volume: 1.0, pan: 0, muted: false, solo: false },
      bass: { volume: 1.0, pan: 0, muted: false, solo: false },
      guitars: { volume: 1.0, pan: 0, muted: false, solo: false },
      vocals_keys: { volume: 1.0, pan: 0, muted: false, solo: false },
    };
    onUpdateMusician({
      ...musician,
      stems: resetStems,
      masterVolume: 1.0,
      isStereo: true,
    });
    setActivePreset('flat');
  };

  // Apply Presets
  const applyPreset = (presetName: string) => {
    setActivePreset(presetName);
    if (presetName === 'vocal_focus') {
      onUpdateMusician({
        ...musician,
        stems: {
          drums: { volume: 0.7, pan: -0.2, muted: false, solo: false },
          bass: { volume: 0.8, pan: 0, muted: false, solo: false },
          guitars: { volume: 0.65, pan: 0.4, muted: false, solo: false },
          vocals_keys: { volume: 1.2, pan: 0, muted: false, solo: false },
        },
      });
    } else if (presetName === 'rhythm_focus') {
      onUpdateMusician({
        ...musician,
        stems: {
          drums: { volume: 1.2, pan: 0, muted: false, solo: false },
          bass: { volume: 1.15, pan: 0, muted: false, solo: false },
          guitars: { volume: 0.7, pan: -0.4, muted: false, solo: false },
          vocals_keys: { volume: 0.75, pan: 0.4, muted: false, solo: false },
        },
      });
    } else if (presetName === 'flat') {
      handleResetMix();
    }
  };

  // Simulate network drop and automatic reconnection
  const handleTestAutoReconnect = () => {
    setIsReconnecting(true);
    setTimeout(() => {
      setIsReconnecting(false);
    }, 1800);
  };

  // Gain reduction calculation from master peak
  const masterPeak = levels.master.peak;
  const grDb = masterPeak > 0.98 ? -((masterPeak - 0.98) * 24) : 0;

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 flex flex-col gap-4">
      {/* Reconnection Alert Banner */}
      {isReconnecting && (
        <div className="bg-amber-950/80 border border-amber-500/50 rounded-xl p-3 flex items-center justify-between text-amber-300 animate-pulse">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
            <span className="text-xs font-semibold">
              Oscilação detectada. Reconectando stream RTP WebRTC...
            </span>
          </div>
          <span className="text-[10px] font-mono">Buffer Auto-Heal (15ms)</span>
        </div>
      )}

      {/* Musician Bar & Connection Diagnostics */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Musician identity */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md text-sm"
            style={{ backgroundColor: musician.avatarColor }}
          >
            M{musician.slot}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-neutral-100">
                {musician.name}
              </h2>
              <span className="text-xs text-neutral-400 font-medium">
                ({musician.instrument})
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>LAN 5 GHz Conectado</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-emerald-400 font-medium">
                {musician.latencyMs} ms latência
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-neutral-400">Jitter: {musician.jitterMs}ms</span>
            </div>
          </div>
        </div>

        {/* Right: Quick Controls & Status */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Audio Output Selection */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs">
            <Headphones className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={musician.audioOutput}
              onChange={(e) =>
                onUpdateMusician({
                  ...musician,
                  audioOutput: e.target.value as 'p2' | 'usb_dac' | 'bluetooth_ll',
                })
              }
              className="bg-transparent text-neutral-300 text-xs outline-none cursor-pointer"
            >
              <option value="p2" className="bg-neutral-900 text-neutral-200">
                P2 / 3.5mm (Ultra Rápido ~12ms)
              </option>
              <option value="usb_dac" className="bg-neutral-900 text-neutral-200">
                USB-C DAC (~9ms)
              </option>
              <option value="bluetooth_ll" className="bg-neutral-900 text-neutral-200">
                Bluetooth aptX-LL (~34ms)
              </option>
            </select>
          </div>

          {/* Mono / Stereo Toggle */}
          <button
            type="button"
            onClick={() =>
              onUpdateMusician({ ...musician, isStereo: !musician.isStereo })
            }
            className={`min-h-[38px] px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              musician.isStereo
                ? 'bg-neutral-800 text-neutral-200 border border-neutral-700'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}
            title="Alternar entre audição estéreo ou mono para 1 fone"
          >
            <span>{musician.isStereo ? 'ESTÉREO' : 'MONO'}</span>
          </button>

          {/* Reset Mix Button */}
          <button
            type="button"
            onClick={handleResetMix}
            className="min-h-[38px] px-3 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white border border-neutral-700 flex items-center gap-1.5 transition-colors"
            title="Resetar todos os faders para 0 dB (Flat)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Resetar Mix</span>
          </button>

          {/* Re-Pair / QR Code Button */}
          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            className="min-h-[38px] p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg border border-neutral-700 transition-colors"
            title="Escanear novo QR Code ou mudar PIN"
          >
            <QrCode className="w-4 h-4" />
          </button>

          {/* Simulate drop test */}
          <button
            type="button"
            onClick={handleTestAutoReconnect}
            className="min-h-[38px] p-2 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 rounded-lg border border-neutral-800 transition-colors"
            title="Testar Reconexão Automática"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preset Pills / Quick Balance Options */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1 mr-1">
            <SlidersHorizontal className="w-3 h-3 text-neutral-400" />
            Presets:
          </span>
          <button
            type="button"
            onClick={() => applyPreset('vocal_focus')}
            className={`min-h-[32px] px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activePreset === 'vocal_focus'
                ? 'bg-amber-500 text-neutral-950 font-semibold shadow-sm'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            Vocal em Destaque
          </button>
          <button
            type="button"
            onClick={() => applyPreset('rhythm_focus')}
            className={`min-h-[32px] px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activePreset === 'rhythm_focus'
                ? 'bg-amber-500 text-neutral-950 font-semibold shadow-sm'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            Base / Bateria Forte
          </button>
          <button
            type="button"
            onClick={() => applyPreset('flat')}
            className={`min-h-[32px] px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activePreset === 'flat'
                ? 'bg-amber-500 text-neutral-950 font-semibold shadow-sm'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            Flat (0 dB)
          </button>
        </div>

        {/* Battery & Health Indicators */}
        <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono shrink-0">
          <span className="flex items-center gap-1">
            <Battery className="w-4 h-4 text-emerald-400" />
            <span>{musician.batteryPercent}% (~4.5h)</span>
          </span>
          <span className="flex items-center gap-1">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span>{musician.wifiSignalDbm} dBm</span>
          </span>
        </div>
      </div>

      {/* Ear Protection Limiter Module */}
      <LimiterDisplay
        enabled={musician.limiterActive}
        gainReductionDb={grDb}
        onToggle={() =>
          onUpdateMusician({ ...musician, limiterActive: !musician.limiterActive })
        }
      />

      {/* Main Console Mixer: 4 Vertical Stem Faders + Master Output */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Stem 1: Bateria (Drums) */}
        <Fader
          label="Bateria"
          subLabel="Kick · Snare · OH"
          volume={musician.stems.drums.volume}
          pan={musician.stems.drums.pan}
          muted={musician.stems.drums.muted}
          solo={musician.stems.drums.solo}
          isSoloActiveElsewhere={anySoloActive}
          peak={levels.drums.peak}
          rms={levels.drums.rms}
          accentColor="#10b981"
          icon="drums"
          onVolumeChange={(v) => handleStemVolumeChange('drums', v)}
          onPanChange={(p) => handleStemPanChange('drums', p)}
          onMuteToggle={() => handleStemMuteToggle('drums')}
          onSoloToggle={() => handleStemSoloToggle('drums')}
        />

        {/* Stem 2: Baixo (Bass) */}
        <Fader
          label="Baixo"
          subLabel="Sub · Low-Mid"
          volume={musician.stems.bass.volume}
          pan={musician.stems.bass.pan}
          muted={musician.stems.bass.muted}
          solo={musician.stems.bass.solo}
          isSoloActiveElsewhere={anySoloActive}
          peak={levels.bass.peak}
          rms={levels.bass.rms}
          accentColor="#06b6d4"
          icon="bass"
          onVolumeChange={(v) => handleStemVolumeChange('bass', v)}
          onPanChange={(p) => handleStemPanChange('bass', p)}
          onMuteToggle={() => handleStemMuteToggle('bass')}
          onSoloToggle={() => handleStemSoloToggle('bass')}
        />

        {/* Stem 3: Guitarras (Guitars) */}
        <Fader
          label="Guitarras"
          subLabel="Lead & Rhythm"
          volume={musician.stems.guitars.volume}
          pan={musician.stems.guitars.pan}
          muted={musician.stems.guitars.muted}
          solo={musician.stems.guitars.solo}
          isSoloActiveElsewhere={anySoloActive}
          peak={levels.guitars.peak}
          rms={levels.guitars.rms}
          accentColor="#f59e0b"
          icon="guitar"
          onVolumeChange={(v) => handleStemVolumeChange('guitars', v)}
          onPanChange={(p) => handleStemPanChange('guitars', p)}
          onMuteToggle={() => handleStemMuteToggle('guitars')}
          onSoloToggle={() => handleStemSoloToggle('guitars')}
        />

        {/* Stem 4: Vocal & Teclado (Vocals & Keys) */}
        <Fader
          label="Vocal & Teclado"
          subLabel="Voz · Rhodes · Synth"
          volume={musician.stems.vocals_keys.volume}
          pan={musician.stems.vocals_keys.pan}
          muted={musician.stems.vocals_keys.muted}
          solo={musician.stems.vocals_keys.solo}
          isSoloActiveElsewhere={anySoloActive}
          peak={levels.vocals_keys.peak}
          rms={levels.vocals_keys.rms}
          accentColor="#8b5cf6"
          icon="mic"
          onVolumeChange={(v) => handleStemVolumeChange('vocals_keys', v)}
          onPanChange={(p) => handleStemPanChange('vocals_keys', p)}
          onMuteToggle={() => handleStemMuteToggle('vocals_keys')}
          onSoloToggle={() => handleStemSoloToggle('vocals_keys')}
        />

        {/* Master Output Channel */}
        <div className="col-span-2 sm:col-span-1">
          <Fader
            label="Master Fone"
            subLabel="IEM Mix Geral"
            volume={musician.masterVolume}
            peak={levels.master.peak}
            rms={levels.master.rms}
            accentColor="#f43f5e"
            icon="master"
            isMaster={true}
            onVolumeChange={(v) => onUpdateMusician({ ...musician, masterVolume: v })}
          />
        </div>
      </div>

      {/* Latency & Protocol Telemetry Footnote */}
      <div className="p-3 bg-neutral-900/60 border border-neutral-800/80 rounded-xl flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Stream RTP WebRTC com Opus 48 kHz (64 kbps por stem) · Sem internet</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span>Buffer: <strong className="text-neutral-200">128 samples</strong></span>
          <span>Perda de pacotes: <strong className="text-emerald-400">0.0%</strong></span>
          <span>Alvo: <strong className="text-amber-400">&lt; 35 ms</strong></span>
        </div>
      </div>

      {/* QR Scanner / PIN Pairing Modal */}
      <QRScannerModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        serverPin={serverPin}
        serverIp={serverIp}
        onConnect={() => {
          setIsQrModalOpen(false);
        }}
        isConnected={musician.connected}
      />
    </div>
  );
};
