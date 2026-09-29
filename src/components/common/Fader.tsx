import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Volume2, VolumeX, Disc3, Mic, Guitar, Music } from 'lucide-react';
import { VUMeter } from './VUMeter';

interface FaderProps {
  label: string;
  subLabel?: string;
  volume: number; // 0 to 1.25 (1.0 = 0 dB)
  pan?: number;   // -1 to 1
  muted?: boolean;
  solo?: boolean;
  isSoloActiveElsewhere?: boolean;
  peak: number;
  rms: number;
  accentColor?: string;
  icon?: 'drums' | 'bass' | 'guitar' | 'mic' | 'master';
  onVolumeChange: (vol: number) => void;
  onPanChange?: (pan: number) => void;
  onMuteToggle?: () => void;
  onSoloToggle?: () => void;
  height?: number;
  isMaster?: boolean;
}

export const Fader: React.FC<FaderProps> = ({
  label,
  subLabel,
  volume,
  pan = 0,
  muted = false,
  solo = false,
  isSoloActiveElsewhere = false,
  peak,
  rms,
  accentColor = '#f59e0b',
  icon = 'mic',
  onVolumeChange,
  onPanChange,
  onMuteToggle,
  onSoloToggle,
  height = 200,
  isMaster = false,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Volume mapping:
  // volume = 0 -> -∞ dB
  // volume = 1.0 -> 0 dB (unity)
  // volume = 1.25 -> +6 dB
  // Let's use normalized position pos: 0 (bottom, 0 vol) to 1 (top, 1.25 vol)
  // pos = volume / 1.25
  const position = Math.max(0, Math.min(1, volume / 1.25));

  const formatDb = (vol: number) => {
    if (vol <= 0.001) return '-∞ dB';
    const db = 20 * Math.log10(vol);
    const sign = db > 0 ? '+' : '';
    return `${sign}${db.toFixed(1)} dB`;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateFromPointer(e.clientY);
  };

  const updateFromPointer = useCallback(
    (clientY: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const relativeY = clientY - rect.top;
      // Invert because top is maximum
      const normalized = Math.max(0, Math.min(1, 1 - relativeY / rect.height));
      const targetVol = normalized * 1.25;
      onVolumeChange(targetVol);
    },
    [onVolumeChange]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      updateFromPointer(e.clientY);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, updateFromPointer]);

  // Double tap to reset unity gain (0 dB / vol 1.0)
  const handleFaderDoubleClick = () => {
    onVolumeChange(1.0);
  };

  const renderIcon = () => {
    switch (icon) {
      case 'drums':
        return <Disc3 className="w-4 h-4 text-emerald-400" />;
      case 'bass':
        return <Music className="w-4 h-4 text-cyan-400" />;
      case 'guitar':
        return <Guitar className="w-4 h-4 text-amber-400" />;
      case 'master':
        return <Volume2 className="w-4 h-4 text-rose-400" />;
      default:
        return <Mic className="w-4 h-4 text-violet-400" />;
    }
  };

  // Determine if this channel is currently muted by solo logic
  const isMutedBySolo = isSoloActiveElsewhere && !solo;

  return (
    <div
      className={`flex flex-col items-center select-none bg-neutral-900/90 border rounded-xl p-3 shadow-md transition-colors ${
        isMaster
          ? 'border-neutral-700 bg-neutral-900 shadow-neutral-950/40'
          : solo
          ? 'border-amber-500/50 shadow-amber-500/10'
          : muted || isMutedBySolo
          ? 'border-neutral-800 opacity-60'
          : 'border-neutral-800 hover:border-neutral-700'
      }`}
    >
      {/* Channel Header */}
      <div className="w-full flex items-center justify-between pb-2 border-b border-neutral-800 mb-2">
        <div className="flex items-center gap-1.5 truncate">
          <div className="p-1 rounded-md bg-neutral-800/80">{renderIcon()}</div>
          <div className="flex flex-col truncate">
            <span className="text-xs font-semibold tracking-tight text-neutral-200 truncate">
              {label}
            </span>
            {subLabel && (
              <span className="text-[10px] text-neutral-400 truncate">
                {subLabel}
              </span>
            )}
          </div>
        </div>
        {isMaster && (
          <span className="text-[9px] font-mono uppercase tracking-wider text-rose-400 bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-800/40">
            Out L/R
          </span>
        )}
      </div>

      {/* Pan Slider (Only for non-master channels) */}
      {!isMaster && onPanChange && (
        <div className="w-full mb-3 px-1 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
            <span>PAN</span>
            <span
              className="cursor-pointer hover:text-amber-400"
              title="Clique duplo para centralizar"
              onClick={() => onPanChange(0)}
            >
              {pan === 0 ? 'C' : pan < 0 ? `L${Math.round(Math.abs(pan) * 100)}` : `R${Math.round(pan * 100)}`}
            </span>
          </div>
          <div className="relative flex items-center">
            <input
              type="range"
              min="-1"
              max="1"
              step="0.05"
              value={pan}
              onChange={(e) => onPanChange(parseFloat(e.target.value))}
              className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-neutral-300 hover:accent-amber-400"
            />
            {/* Center tick */}
            <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-2 bg-neutral-600 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Solo & Mute Buttons */}
      {!isMaster && (
        <div className="w-full grid grid-cols-2 gap-1.5 mb-3">
          <button
            type="button"
            onClick={onSoloToggle}
            className={`min-h-[38px] flex items-center justify-center rounded-md font-mono text-xs font-bold transition-all ${
              solo
                ? 'bg-amber-500 text-neutral-950 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-750 border border-neutral-700/60'
            }`}
          >
            SOLO
          </button>
          <button
            type="button"
            onClick={onMuteToggle}
            className={`min-h-[38px] flex items-center justify-center rounded-md font-mono text-xs font-bold transition-all ${
              muted
                ? 'bg-red-600 text-white shadow-[0_0_8px_rgba(220,38,38,0.5)]'
                : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-750 border border-neutral-700/60'
            }`}
          >
            MUTE
          </button>
        </div>
      )}

      {/* Fader & VU Meter Assembly */}
      <div className="flex items-center justify-center gap-2 py-1 w-full">
        {/* dB Scale Markings */}
        <div
          className="flex flex-col justify-between text-[9px] font-mono text-neutral-400 text-right pr-1 select-none tabular-nums"
          style={{ height: `${height}px` }}
        >
          <span className="text-neutral-400">+6</span>
          <span className="text-amber-400 font-semibold cursor-pointer" onClick={() => onVolumeChange(1.0)}>0</span>
          <span>-5</span>
          <span>-10</span>
          <span>-20</span>
          <span>-30</span>
          <span className="cursor-pointer" onClick={() => onVolumeChange(0)}>-∞</span>
        </div>

        {/* Vertical Track Container */}
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onDoubleClick={handleFaderDoubleClick}
          className="relative w-12 bg-neutral-950 border border-neutral-800 rounded-lg flex items-center justify-center cursor-pointer select-none touch-none shadow-inner"
          style={{ height: `${height}px` }}
        >
          {/* Center Guide Slot */}
          <div className="w-1.5 h-full bg-neutral-900 border-x border-neutral-800 relative">
            {/* Unity (0 dB) Line Notch */}
            <div
              className="absolute left-[-8px] right-[-8px] h-0.5 bg-amber-500/80 pointer-events-none"
              style={{ bottom: `${(1.0 / 1.25) * 100}%` }}
              title="0 dB Unity"
            />
          </div>

          {/* Console Fader Cap (Tactile Slider Knob) */}
          <div
            className={`absolute left-1 right-1 h-10 rounded bg-gradient-to-b from-neutral-700 via-neutral-800 to-neutral-900 border border-neutral-600 shadow-[0_4px_10px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center transition-transform active:scale-[0.98] ${
              isDragging ? 'ring-2 ring-amber-400/80' : ''
            }`}
            style={{
              bottom: `calc(${position * 100}% - 20px)`,
            }}
          >
            {/* Fader Cap Finger Ridge */}
            <div className="w-full px-2 flex flex-col gap-1 items-center">
              <div
                className="w-full h-0.5 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
              <div className="w-3/4 h-[1px] bg-neutral-500/60" />
              <div className="w-3/4 h-[1px] bg-neutral-500/60" />
            </div>
          </div>
        </div>

        {/* High-Resolution VU Meter for this stem */}
        <VUMeter peak={peak} rms={rms} height={height} showLabels={false} />
      </div>

      {/* Numerical Volume Readout */}
      <div className="mt-3 w-full flex flex-col items-center">
        <span
          className="text-xs font-mono font-bold text-neutral-200 tabular-nums cursor-pointer hover:text-amber-400"
          title="Clique duplo para 0 dB"
          onDoubleClick={handleFaderDoubleClick}
        >
          {formatDb(volume)}
        </span>
      </div>
    </div>
  );
};
