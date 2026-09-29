import React from 'react';
import { MusicianProfile, StemId } from '../../types/mixlink';
import { StemLevels } from '../../audio/AudioEngine';
import { Headphones, Sliders, Battery, Wifi, CheckCircle2 } from 'lucide-react';

interface BandMembersViewProps {
  musicians: MusicianProfile[];
  activeMusicianId: string;
  onSelectMusician: (id: string) => void;
  onUpdateMusician: (updated: MusicianProfile) => void;
  levels: StemLevels;
}

export const BandMembersView: React.FC<BandMembersViewProps> = ({
  musicians,
  activeMusicianId,
  onSelectMusician,
  onUpdateMusician,
}) => {
  const stemNames: Record<StemId, { name: string; color: string }> = {
    drums: { name: 'Bateria', color: '#10b981' },
    bass: { name: 'Baixo', color: '#06b6d4' },
    guitars: { name: 'Guitarras', color: '#f59e0b' },
    vocals_keys: { name: 'Vocal/Keys', color: '#8b5cf6' },
  };

  const formatDb = (vol: number) => {
    if (vol <= 0.001) return '-∞';
    const db = 20 * Math.log10(vol);
    return `${db > 0 ? '+' : ''}${db.toFixed(1)} dB`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      {/* Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-neutral-100">
              Visão Geral dos 4 Músicos (Mixes Independentes)
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
              4 CANAIS SEPARADOS
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Cada músico ajusta os 4 stems no seu celular sem afetar o retorno dos colegas
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <Headphones className="w-4 h-4 text-amber-400" />
          <span>Clique em um músico para alternar o monitor para o mix dele</span>
        </div>
      </div>

      {/* 4 Musician Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {musicians.map((m) => {
          const isSelected = m.id === activeMusicianId;

          return (
            <div
              key={m.id}
              onClick={() => onSelectMusician(m.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-neutral-900 border-amber-500 shadow-[0_0_16px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/50'
                  : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow"
                      style={{ backgroundColor: m.avatarColor }}
                    >
                      M{m.slot}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-100">{m.name}</h3>
                      <span className="text-xs text-neutral-400">{m.instrument}</span>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                      <CheckCircle2 className="w-4 h-4 text-amber-400" />
                      Ativo
                    </span>
                  )}
                </div>

                {/* Diagnostics */}
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-neutral-950 rounded-xl text-[11px] font-mono text-neutral-400 mb-3 border border-neutral-800">
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-500">Latência:</span>
                    <span className="text-emerald-400 font-semibold">{m.latencyMs} ms</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Battery className="w-3 h-3 text-emerald-400" />
                    <span>{m.batteryPercent}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Wifi className="w-3 h-3 text-emerald-400" />
                    <span>{m.wifiSignalDbm} dBm</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-500">Modo:</span>
                    <span className="text-neutral-300">{m.isStereo ? 'Stereo' : 'Mono'}</span>
                  </div>
                </div>

                {/* Mix Stems Mini Bars */}
                <div className="space-y-2 mb-4">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500 block mb-1">
                    Equilíbrio do Mix Pessoal
                  </span>
                  {(Object.keys(m.stems) as StemId[]).map((id) => {
                    const stem = m.stems[id];
                    const percent = Math.min(100, (stem.volume / 1.25) * 100);

                    return (
                      <div key={id} className="flex flex-col gap-0.5">
                        <div className="flex justify-between text-[10px] font-mono text-neutral-400">
                          <span style={{ color: stemNames[id].color }}>
                            {stemNames[id].name}
                          </span>
                          <span className={stem.muted ? 'text-red-400' : 'text-neutral-300'}>
                            {stem.muted ? 'MUTED' : formatDb(stem.volume)}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-neutral-950 rounded overflow-hidden">
                          <div
                            className="h-full rounded transition-all duration-150"
                            style={{
                              width: stem.muted ? '0%' : `${percent}%`,
                              backgroundColor: stemNames[id].color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Master Volume & Limiter Info */}
              <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
                <span className="text-neutral-400">Master:</span>
                <span className="font-mono text-neutral-200 font-semibold">
                  {formatDb(m.masterVolume)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
