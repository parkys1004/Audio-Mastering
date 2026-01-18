import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="w-full py-8 px-8 border-t border-gray-800 mt-auto bg-gray-950">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-6">
        
        {/* Kmong Button */}
        <a 
          href="https://kmong.com/gig/730531" 
          target="_blank" 
          rel="noopener noreferrer"
          className="
            group flex items-center gap-2.5 px-6 py-2.5 rounded-full 
            bg-[#FFD400] text-black font-bold text-sm tracking-tight
            shadow-[0_0_20px_rgba(255,212,0,0.15)] 
            hover:shadow-[0_0_30px_rgba(255,212,0,0.4)] hover:bg-[#ffe033] hover:scale-105
            transition-all duration-300 transform
          "
        >
          <span>{t('footer.kmong')}</span>
          <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </a>

        {/* Copyright */}
        <p className="text-xs text-gray-600 font-medium tracking-wide">
          {t('footer.rights')}
        </p>
      </div>
    </footer>
  );
};

export default Footer;