import React from 'react';

interface VUMeterProps {
  peak: number; // 0 to 1.2+
  rms: number;  // 0 to 1.0
  height?: number; // default 160px
  showLabels?: boolean;
  orientation?: 'vertical' | 'horizontal';
}

export const VUMeter: React.FC<VUMeterProps> = ({
  peak,
  rms,
  height = 140,
  showLabels = false,
  orientation = 'vertical',
}) => {
  // Convert linear 0..1 to dBFS (-60 to +3 dB)
  const toDb = (linear: number) => {
    if (linear <= 0.001) return -60;
    const db = 20 * Math.log10(linear);
    return Math.max(-60, Math.min(3, db));
  };

  const peakDb = toDb(peak);
  const rmsDb = toDb(rms);

  // Normalize dB (-60 to +3) to percentage 0% to 100%
  const dbToPercent = (db: number) => {
    // -60dB -> 0%, 0dB -> 85%, +3dB -> 100%
    if (db <= -60) return 0;
    return Math.min(100, Math.max(0, ((db + 60) / 63) * 100));
  };

  const peakPercent = dbToPercent(peakDb);
  const rmsPercent = dbToPercent(rmsDb);
  const isClipping = peakDb >= -0.1;

  const segments = 24;

  if (orientation === 'horizontal') {
    return (
      <div className="flex flex-col gap-1 w-full">
        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
          <span>{rmsDb > -59 ? `${rmsDb.toFixed(1)} dB` : '-∞ dB'}</span>
          {isClipping && <span className="text-red-400 font-semibold animate-pulse">CLIP</span>}
        </div>
        <div className="relative h-2.5 bg-neutral-900 border border-neutral-800 rounded-sm overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 transition-all duration-75"
            style={{ width: `${rmsPercent}%` }}
          />
          {peakPercent > 0 && (
            <div
              className={`absolute top-0 bottom-0 w-0.5 ${isClipping ? 'bg-red-400' : 'bg-neutral-100'}`}
              style={{ left: `${Math.min(99, peakPercent)}%` }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 select-none">
      {/* dB scale labels if enabled */}
      {showLabels && (
        <div
          className="flex flex-col justify-between text-[9px] font-mono text-neutral-400 pr-1 text-right tabular-nums"
          style={{ height: `${height}px` }}
        >
          <span className="text-red-400">+3</span>
          <span className="text-amber-400">0</span>
          <span>-6</span>
          <span>-12</span>
          <span>-24</span>
          <span>-40</span>
          <span>-∞</span>
        </div>
      )}

      {/* LED Meter Tower */}
      <div
        className="w-3.5 bg-neutral-900 border border-neutral-800 rounded-xs flex flex-col justify-between p-0.5 relative overflow-hidden"
        style={{ height: `${height}px` }}
      >
        {/* Clip LED on top */}
        <div
          className={`h-1.5 w-full rounded-xs transition-colors duration-100 ${
            isClipping ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' : 'bg-red-950/40'
          }`}
        />

        {/* 20 Segment Ladder */}
        <div className="flex-1 flex flex-col-reverse gap-[1.5px] mt-0.5">
          {Array.from({ length: segments }).map((_, i) => {
            const segPercent = ((i + 1) / segments) * 100;
            const isLit = rmsPercent >= segPercent;
            const isPeakLit = Math.abs(peakPercent - segPercent) < 4 && peakPercent > 5;

            // Color stages: bottom green, mid amber (around 0dB), top red
            let baseColor = 'bg-emerald-950/40';
            let litColor = 'bg-emerald-500';

            if (i >= segments * 0.8) {
              baseColor = 'bg-red-950/40';
              litColor = 'bg-red-500 shadow-[0_0_4px_#ef4444]';
            } else if (i >= segments * 0.65) {
              baseColor = 'bg-amber-950/40';
              litColor = 'bg-amber-400';
            }

            return (
              <div
                key={i}
                className={`w-full h-1 rounded-xs transition-colors duration-75 ${
                  isPeakLit ? 'bg-neutral-100 shadow-[0_0_4px_#ffffff]' : isLit ? litColor : baseColor
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
