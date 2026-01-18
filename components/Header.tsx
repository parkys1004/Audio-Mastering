import React from 'react';
import { MusicNoteIcon } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';

const Header: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="w-full py-5 px-8 border-b border-gray-800/50 bg-gray-950/40 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3 select-none group">
          <div className="relative">
            <div className="absolute inset-0 bg-primary-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
            <div className="relative p-2 bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl shadow-lg">
              <MusicNoteIcon className="w-6 h-6 text-primary-400 group-hover:text-primary-300 transition-colors" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex flex-col leading-none">
            <span>Mastering <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-cyan-400 text-glow">Composer</span></span>
            <span className="text-[10px] font-mono text-gray-500 tracking-[0.2em] pt-1">{t('header.subtitle')}</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-8">
          {/* Language Toggle */}
          <div className="flex items-center p-1 bg-gray-800 rounded-lg border border-gray-700/50">
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 text-xs font-bold rounded transition-all ${language === 'en' ? 'bg-primary-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('ko')}
              className={`px-2 py-1 text-xs font-bold rounded transition-all ${language === 'ko' ? 'bg-primary-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
            >
              KR
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;