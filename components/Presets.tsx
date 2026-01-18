import React from 'react';
import { MasteringParams } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

const PRESETS_DATA = [
  {
    id: 'universal',
    params: {
      eq: { lowGain: 0.5, midGain: -0.5, highGain: 1.0 },
      compressor: { threshold: -18, ratio: 4, attack: 0.01, release: 0.2 },
      stereoWidth: 1.05,
    }
  },
  {
    id: 'streaming',
    params: {
      eq: { lowGain: 1.0, midGain: -0.5, highGain: 1.5 },
      compressor: { threshold: -16, ratio: 3, attack: 0.01, release: 0.2 },
      stereoWidth: 1.1,
    }
  },
  {
    id: 'club',
    params: {
      eq: { lowGain: 4.0, midGain: -1.5, highGain: 2.5 },
      compressor: { threshold: -22, ratio: 6, attack: 0.005, release: 0.1 },
      stereoWidth: 1.3,
    }
  },
  {
    id: 'fire',
    params: {
      eq: { lowGain: 2.0, midGain: -1.0, highGain: 3.0 },
      compressor: { threshold: -24, ratio: 8, attack: 0.003, release: 0.08 },
      stereoWidth: 1.2,
    }
  },
  {
    id: 'punch',
    params: {
      eq: { lowGain: 1.5, midGain: 0.0, highGain: 1.0 },
      compressor: { threshold: -18, ratio: 4, attack: 0.03, release: 0.1 },
      stereoWidth: 1.1,
    }
  },
  {
    id: 'clarity',
    params: {
      eq: { lowGain: -1.0, midGain: -2.0, highGain: 4.0 },
      compressor: { threshold: -18, ratio: 3, attack: 0.01, release: 0.2 },
      stereoWidth: 1.15,
    }
  },
  {
    id: 'podcast',
    params: {
      eq: { lowGain: -2.0, midGain: 1.5, highGain: 0.5 },
      compressor: { threshold: -24, ratio: 5, attack: 0.005, release: 0.15 },
      stereoWidth: 1.0, // Mono compatible
    }
  },
  {
    id: 'vintage',
    params: {
      eq: { lowGain: 2.5, midGain: 1.0, highGain: -2.0 },
      compressor: { threshold: -15, ratio: 3, attack: 0.02, release: 0.4 },
      stereoWidth: 0.95,
    }
  },
  {
    id: 'tape',
    params: {
      eq: { lowGain: 1.0, midGain: 0.5, highGain: -1.0 },
      compressor: { threshold: -12, ratio: 2, attack: 0.05, release: 0.3 },
      stereoWidth: 0.9,
    }
  },
  {
    id: 'natural',
    params: {
      eq: { lowGain: 0.0, midGain: 0.0, highGain: 0.5 },
      compressor: { threshold: -12, ratio: 2, attack: 0.02, release: 0.2 },
      stereoWidth: 1.0,
    }
  },
  {
    id: 'spatial',
    params: {
      eq: { lowGain: 1.0, midGain: -1.0, highGain: 2.0 },
      compressor: { threshold: -18, ratio: 3, attack: 0.01, release: 0.2 },
      stereoWidth: 1.6,
    }
  },
  {
    id: 'cinematic',
    params: {
      eq: { lowGain: 3.0, midGain: -1.0, highGain: 2.0 },
      compressor: { threshold: -20, ratio: 3, attack: 0.05, release: 0.5 },
      stereoWidth: 1.4,
    }
  }
];

interface PresetsProps {
  onSelect: (id: string, params: MasteringParams) => void;
  activePresetId: string | null;
  disabled?: boolean;
}

const Presets: React.FC<PresetsProps> = ({ onSelect, activePresetId, disabled }) => {
  const { t } = useLanguage();

  return (
    <div className="w-full mt-8">
       <div className="flex items-center gap-2 mb-4">
        <div className="h-4 w-1 bg-gradient-to-b from-purple-400 to-purple-600 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
        <h3 className="text-lg font-bold text-white tracking-tight">{t('presets.title')}</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {PRESETS_DATA.map((preset) => {
          const isActive = activePresetId === preset.id;
          
          return (
            <button
              key={preset.id}
              onClick={() => onSelect(preset.id, preset.params)}
              disabled={disabled}
              className={`
                group relative flex flex-col items-start p-4 rounded-2xl text-left transition-all duration-300
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                ${isActive 
                  ? 'bg-primary-600/90 border border-primary-400 shadow-[0_0_20px_rgba(99,102,241,0.4)] scale-[1.02]' 
                  : 'glass-button hover:bg-gray-800/60'
                }
              `}
            >
              <div className="w-full flex justify-between items-center mb-1.5">
                <span className={`text-sm font-bold transition-colors truncate pr-2 ${isActive ? 'text-white' : 'text-primary-300 group-hover:text-white'}`}>
                  {t(`preset.${preset.id}.name`)}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full transition-all flex-shrink-0 ${isActive ? 'bg-white shadow-[0_0_8px_white]' : 'bg-gray-600 group-hover:bg-primary-400 group-hover:shadow-[0_0_8px_#818cf8]'}`}></span>
              </div>
              <p className={`text-[10px] leading-tight font-medium line-clamp-2 transition-colors ${isActive ? 'text-blue-100' : 'text-gray-500 group-hover:text-gray-400'}`}>
                {t(`preset.${preset.id}.desc`)}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Presets;