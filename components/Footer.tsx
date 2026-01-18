import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="w-full py-6 px-8 border-t border-gray-800 mt-auto bg-gray-950">
      <div className="max-w-7xl mx-auto flex items-center justify-center text-xs text-gray-500">
        <p>{t('footer.rights')}</p>
      </div>
    </footer>
  );
};

export default Footer;