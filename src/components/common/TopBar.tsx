import React from 'react';
import { Play, Square } from 'lucide-react';

export type ActiveTab = 'client' | 'server' | 'band_members' | 'native_code' | 'bandlab_guide';

interface TopBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isPlaying: boolean;
  onToggleAudio: () => void;
  isAudioSource: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onTabChange,
  isPlaying,
  onToggleAudio,
  isAudioSource,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Zone 1: Brand title wordmark */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onTabChange('client')}
            className="text-lg font-bold tracking-tight text-white hover:text-amber-400 transition-colors flex items-center gap-2"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
            MixLink
          </button>
        </div>

        {/* Zone 2: Clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => onTabChange('client')}
            className={`transition-colors py-1 ${
              activeTab === 'client'
                ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
                : 'text-neutral-400 hover:text-neutral-100'
            }`}
          >
            Monitor Pessoal
          </button>
          <button
            onClick={() => onTabChange('server')}
            className={`transition-colors py-1 ${
              activeTab === 'server'
                ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
                : 'text-neutral-400 hover:text-neutral-100'
            }`}
          >
            Servidor Local
          </button>
          <button
            onClick={() => onTabChange('band_members')}
            className={`transition-colors py-1 ${
              activeTab === 'band_members'
                ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
                : 'text-neutral-400 hover:text-neutral-100'
            }`}
          >
            4 Músicos (Simulador)
          </button>
          <button
            onClick={() => onTabChange('native_code')}
            className={`transition-colors py-1 ${
              activeTab === 'native_code'
                ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
                : 'text-neutral-400 hover:text-neutral-100'
            }`}
          >
            Código Nativo Swift/Kotlin
          </button>
          <button
            onClick={() => onTabChange('bandlab_guide')}
            className={`transition-colors py-1 ${
              activeTab === 'bandlab_guide'
                ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
                : 'text-neutral-400 hover:text-neutral-100'
            }`}
          >
            Guia BandLab
          </button>
        </nav>

        {/* Zone 3: Primary action button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleAudio}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              isPlaying
                ? 'bg-red-600/90 hover:bg-red-700 text-white shadow-[0_0_12px_rgba(220,38,38,0.3)]'
                : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
            }`}
          >
            {isPlaying ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Pausar Áudio</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Ouvir Retorno</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mobile navigation tab strip */}
      <div className="md:hidden flex items-center justify-around px-2 py-1.5 bg-neutral-900 border-t border-neutral-800 text-xs overflow-x-auto">
        <button
          onClick={() => onTabChange('client')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${
            activeTab === 'client' ? 'bg-amber-500/20 text-amber-400 font-semibold' : 'text-neutral-400'
          }`}
        >
          Monitor
        </button>
        <button
          onClick={() => onTabChange('server')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${
            activeTab === 'server' ? 'bg-amber-500/20 text-amber-400 font-semibold' : 'text-neutral-400'
          }`}
        >
          Servidor
        </button>
        <button
          onClick={() => onTabChange('band_members')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${
            activeTab === 'band_members' ? 'bg-amber-500/20 text-amber-400 font-semibold' : 'text-neutral-400'
          }`}
        >
          4 Músicos
        </button>
        <button
          onClick={() => onTabChange('native_code')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${
            activeTab === 'native_code' ? 'bg-amber-500/20 text-amber-400 font-semibold' : 'text-neutral-400'
          }`}
        >
          Nativo
        </button>
        <button
          onClick={() => onTabChange('bandlab_guide')}
          className={`px-2.5 py-1 rounded whitespace-nowrap ${
            activeTab === 'bandlab_guide' ? 'bg-amber-500/20 text-amber-400 font-semibold' : 'text-neutral-400'
          }`}
        >
          BandLab
        </button>
      </div>
    </header>
  );
};
