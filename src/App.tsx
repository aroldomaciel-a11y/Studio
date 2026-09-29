import React, { useState, useEffect, useCallback } from 'react';
import { MusicianProfile, ServerState, StemId } from './types/mixlink';
import { StemLevels, audioEngine } from './audio/AudioEngine';
import { TopBar, ActiveTab } from './components/common/TopBar';
import { ClientMixer } from './components/client/ClientMixer';
import { ServerDashboard } from './components/server/ServerDashboard';
import { BandMembersView } from './components/band/BandMembersView';
import { BandLabGuide } from './components/guide/BandLabGuideModal';
import { NativeCodeViewer } from './components/native-code/NativeCodeViewer';

const INITIAL_MUSICIANS: MusicianProfile[] = [
  {
    id: 'm1',
    slot: 1,
    name: 'Alexandre',
    instrument: 'Voz Principal & Teclado',
    avatarColor: '#8b5cf6',
    connected: true,
    ipAddress: '192.168.1.121',
    latencyMs: 18.2,
    jitterMs: 1.8,
    packetLoss: 0.0,
    batteryPercent: 88,
    wifiSignalDbm: -42,
    audioOutput: 'p2',
    isStereo: true,
    limiterActive: true,
    masterVolume: 1.0,
    stems: {
      drums: { volume: 0.8, pan: 0, muted: false, solo: false },
      bass: { volume: 0.85, pan: 0, muted: false, solo: false },
      guitars: { volume: 0.75, pan: 0.3, muted: false, solo: false },
      vocals_keys: { volume: 1.15, pan: 0, muted: false, solo: false },
    },
  },
  {
    id: 'm2',
    slot: 2,
    name: 'Bruno',
    instrument: 'Baterista',
    avatarColor: '#10b981',
    connected: true,
    ipAddress: '192.168.1.134',
    latencyMs: 19.5,
    jitterMs: 2.1,
    packetLoss: 0.0,
    batteryPercent: 78,
    wifiSignalDbm: -45,
    audioOutput: 'p2',
    isStereo: true,
    limiterActive: true,
    masterVolume: 1.05,
    stems: {
      drums: { volume: 1.2, pan: 0, muted: false, solo: false },
      bass: { volume: 1.1, pan: 0, muted: false, solo: false },
      guitars: { volume: 0.6, pan: -0.4, muted: false, solo: false },
      vocals_keys: { volume: 0.7, pan: 0.4, muted: false, solo: false },
    },
  },
  {
    id: 'm3',
    slot: 3,
    name: 'Carla',
    instrument: 'Guitarrista',
    avatarColor: '#f59e0b',
    connected: true,
    ipAddress: '192.168.1.148',
    latencyMs: 21.0,
    jitterMs: 2.4,
    packetLoss: 0.0,
    batteryPercent: 84,
    wifiSignalDbm: -48,
    audioOutput: 'usb_dac',
    isStereo: true,
    limiterActive: true,
    masterVolume: 0.95,
    stems: {
      drums: { volume: 0.9, pan: -0.2, muted: false, solo: false },
      bass: { volume: 0.8, pan: 0, muted: false, solo: false },
      guitars: { volume: 1.2, pan: 0, muted: false, solo: false },
      vocals_keys: { volume: 0.9, pan: 0.3, muted: false, solo: false },
    },
  },
  {
    id: 'm4',
    slot: 4,
    name: 'Diego',
    instrument: 'Baixista',
    avatarColor: '#06b6d4',
    connected: true,
    ipAddress: '192.168.1.155',
    latencyMs: 17.8,
    jitterMs: 1.5,
    packetLoss: 0.0,
    batteryPercent: 69,
    wifiSignalDbm: -40,
    audioOutput: 'p2',
    isStereo: true,
    limiterActive: true,
    masterVolume: 1.0,
    stems: {
      drums: { volume: 1.05, pan: 0, muted: false, solo: false },
      bass: { volume: 1.25, pan: 0, muted: false, solo: false },
      guitars: { volume: 0.65, pan: -0.3, muted: false, solo: false },
      vocals_keys: { volume: 0.7, pan: 0.3, muted: false, solo: false },
    },
  },
];

const INITIAL_SERVER_STATE: ServerState = {
  isRunning: true,
  lanIp: '192.168.1.105',
  port: 7890,
  pinCode: '849201',
  sampleRate: 48000,
  bitrateKbps: 64,
  bufferSize: 128,
  audioSource: 'simulated_stems',
  isRecording: false,
  recordingSeconds: 0,
  recordedBlobUrl: null,
  recordedSizeMb: 0,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('client');
  const [musicians, setMusicians] = useState<MusicianProfile[]>(INITIAL_MUSICIANS);
  const [activeMusicianId, setActiveMusicianId] = useState<string>('m1');
  const [serverState, setServerState] = useState<ServerState>(INITIAL_SERVER_STATE);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const [levels, setLevels] = useState<StemLevels>({
    drums: { peak: 0, rms: 0 },
    bass: { peak: 0, rms: 0 },
    guitars: { peak: 0, rms: 0 },
    vocals_keys: { peak: 0, rms: 0 },
    master: { peak: 0, rms: 0 },
  });

  // Setup audio engine levels listener
  useEffect(() => {
    audioEngine.setMeterCallback((lvl) => {
      setLevels(lvl);
    });
  }, []);

  const activeMusician = musicians.find((m) => m.id === activeMusicianId) || musicians[0];

  // Sync active musician mix to audio engine
  const syncMusicianToAudioEngine = useCallback((m: MusicianProfile) => {
    const anySolo = Object.values(m.stems).some((s) => s.solo);
    (Object.keys(m.stems) as StemId[]).forEach((id) => {
      audioEngine.updateStemMix(id, m.stems[id], anySolo);
    });
    audioEngine.setMasterVolume(m.masterVolume);
    audioEngine.setLimiterEnabled(m.limiterActive);
    audioEngine.setStereoMode(m.isStereo);
  }, []);

  // Update musician profile
  const handleUpdateMusician = (updated: MusicianProfile) => {
    setMusicians((prev) =>
      prev.map((m) => (m.id === updated.id ? updated : m))
    );
    if (updated.id === activeMusicianId) {
      syncMusicianToAudioEngine(updated);
    }
  };

  // Switch active musician
  const handleSelectMusician = (id: string) => {
    setActiveMusicianId(id);
    const target = musicians.find((m) => m.id === id);
    if (target) {
      syncMusicianToAudioEngine(target);
    }
  };

  // Toggle master audio play/stop
  const handleToggleAudio = async () => {
    if (isPlaying) {
      audioEngine.stopAudio();
      setIsPlaying(false);
    } else {
      await audioEngine.startAudio();
      syncMusicianToAudioEngine(activeMusician);
      setIsPlaying(true);
    }
  };

  const handleUpdateServerState = (partial: Partial<ServerState>) => {
    setServerState((prev) => ({ ...prev, ...partial }));
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Top Navigation Bar adhering strictly to Top Bar Contract */}
      <TopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isPlaying={isPlaying}
        onToggleAudio={handleToggleAudio}
        isAudioSource={serverState.audioSource}
      />

      {/* Musician Switcher Bar (Quickly test any of the 4 musicians' in-ear mix) */}
      <section aria-label="Músicos da banda" className="bg-neutral-900/60 border-b border-neutral-800/80 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span className="font-semibold text-neutral-300">Retorno Ativo no Fone:</span>
            <div className="flex items-center gap-1.5">
              {musicians.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSelectMusician(m.id)}
                  className={`min-h-[32px] px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                    m.id === activeMusicianId
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                      : 'bg-neutral-800/70 text-neutral-300 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: m.id === activeMusicianId ? '#0a0a0a' : m.avatarColor }}
                  />
                  <span>M{m.slot}: {m.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-neutral-400 font-mono">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Wi-Fi 5 GHz LAN</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>Codec Opus 48 kHz</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-400">PIN: {serverState.pinCode}</span>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 pb-12">
        {activeTab === 'client' && (
          <ClientMixer
            musician={activeMusician}
            onUpdateMusician={handleUpdateMusician}
            levels={levels}
            serverPin={serverState.pinCode}
            serverIp={serverState.lanIp}
            serverRunning={serverState.isRunning}
          />
        )}

        {activeTab === 'server' && (
          <ServerDashboard
            serverState={serverState}
            onUpdateServerState={handleUpdateServerState}
            musicians={musicians}
            levels={levels}
            isPlaying={isPlaying}
            onTogglePlay={handleToggleAudio}
          />
        )}

        {activeTab === 'band_members' && (
          <BandMembersView
            musicians={musicians}
            activeMusicianId={activeMusicianId}
            onSelectMusician={handleSelectMusician}
            onUpdateMusician={handleUpdateMusician}
            levels={levels}
          />
        )}

        {activeTab === 'bandlab_guide' && <BandLabGuide />}

        {activeTab === 'native_code' && <NativeCodeViewer />}
      </main>

      {/* Quiet, Clean Footer */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950 py-4 px-6 text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-300">MixLink</span>
            <span aria-hidden="true">·</span>
            <span>Sistema de Monitoramento Pessoal Sem Fio em Rede Local</span>
          </div>
          <div className="flex items-center gap-3 text-neutral-400 font-mono text-[11px]">
            <span>48 kHz Opus / 64 kbps</span>
            <span aria-hidden="true">·</span>
            <span>DTLS Criptografado</span>
            <span aria-hidden="true">·</span>
            <span>Latência &lt; 35 ms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
