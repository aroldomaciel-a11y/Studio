import React from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

interface LimiterDisplayProps {
  enabled: boolean;
  gainReductionDb: number; // 0 to -12 dB
  onToggle: () => void;
}

export const LimiterDisplay: React.FC<LimiterDisplayProps> = ({
  enabled,
  gainReductionDb,
  onToggle,
}) => {
  // Normalize gain reduction 0 to 12 dB for meter
  const grPercent = Math.min(100, Math.max(0, (Math.abs(gainReductionDb) / 12) * 100));

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/90 border border-neutral-800">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onToggle}
          className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors ${
            enabled
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
          }`}
          title={enabled ? 'Proteção auditiva ativa' : 'Limiter em bypass'}
        >
          {enabled ? <ShieldCheck className="w-5 h-5 text-emerald-400" /> : <ShieldAlert className="w-5 h-5 text-neutral-400" />}
        </button>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-200">
              Proteção Auditiva (Peak Limiter)
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                enabled
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                  : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              {enabled ? 'ATIVO (-0.5 dB)' : 'BYPASS'}
            </span>
          </div>
          <span className="text-[11px] text-neutral-400">
            Protege contra picos súbitos, estalos e microfonias no fone
          </span>
        </div>
      </div>

      {/* Gain Reduction (GR) Meter */}
      <div className="flex flex-col items-end gap-1 w-32">
        <div className="flex items-center justify-between w-full text-[10px] font-mono text-neutral-400">
          <span>GR (dB)</span>
          <span className={gainReductionDb < -0.2 ? 'text-amber-400 font-bold' : 'text-neutral-400'}>
            {gainReductionDb < -0.1 ? `${gainReductionDb.toFixed(1)} dB` : '0.0 dB'}
          </span>
        </div>
        <div className="w-full h-2 bg-neutral-950 rounded border border-neutral-800 overflow-hidden relative">
          <div
            className="h-full bg-amber-500 transition-all duration-75"
            style={{ width: `${grPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
