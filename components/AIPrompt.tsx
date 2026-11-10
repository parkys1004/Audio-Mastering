import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface AIPromptProps {
  onGenerate: (prompt: string) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
  hasKey: boolean;
  onOpenKeySettings: () => void;
}

const AIPrompt: React.FC<AIPromptProps> = ({ onGenerate, isLoading, disabled, hasKey, onOpenKeySettings }) => {
  const { t } = useLanguage();
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onGenerate(prompt);
    }
  };

  return (
    <div className="w-full mt-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-4 w-1 bg-gradient-to-b from-indigo-400 to-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)]"></div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
          {t('ai.title')}
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            GEMINI
          </span>
        </h3>
        <button
          type="button"
          onClick={onOpenKeySettings}
          className={`ml-auto flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-colors ${
            hasKey
              ? 'text-green-400 border-green-500/30 bg-green-500/10 hover:bg-green-500/20'
              : 'text-amber-300 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${hasKey ? 'bg-green-400' : 'bg-amber-400 animate-pulse'}`}></span>
          {hasKey ? t('key.btn_set') : t('key.btn_unset')}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="relative group perspective-500">
        <div className={`absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 rounded-2xl opacity-30 group-hover:opacity-60 transition duration-500 blur-lg ${isLoading ? 'opacity-80 animate-pulse' : ''}`}></div>
        
        <div className="relative flex items-center bg-gray-900/80 backdrop-blur-xl rounded-2xl p-1.5 border border-gray-700/50 shadow-2xl">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={disabled || isLoading}
            placeholder={t('ai.placeholder')}
            className="flex-grow bg-transparent text-gray-100 placeholder-gray-500 text-sm px-4 py-3 outline-none disabled:opacity-50 font-medium tracking-wide"
          />
          
          <button
            type="submit"
            disabled={disabled || isLoading || !prompt.trim()}
            className="
              relative overflow-hidden
              bg-gradient-to-r from-indigo-600 to-purple-600 
              hover:from-indigo-500 hover:to-purple-500 
              text-white p-3 rounded-xl transition-all 
              shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]
              disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
              flex items-center gap-2 font-bold min-w-[120px] justify-center
              border border-white/10
            "
          >
            {/* Glossy sheen overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none"></div>

            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-xs uppercase tracking-wider">{t('ai.processing')}</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-xs uppercase tracking-wider">{t('ai.generate')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AIPrompt;