import React, { useState } from 'react';
import { XMarkIcon } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { clearApiKey, getApiKey, isKeyRemembered, maskKey, saveApiKey } from '../services/apiKey';

interface ApiKeyModalProps {
  onClose: () => void;
  onChange: (hasKey: boolean) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onClose, onChange }) => {
  const { t } = useLanguage();
  const existing = getApiKey();
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(existing ? isKeyRemembered() : true);

  const handleSave = () => {
    if (!value.trim()) return;
    saveApiKey(value, remember);
    onChange(true);
    onClose();
  };

  const handleDelete = () => {
    clearApiKey();
    onChange(false);
    setValue('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md glass-panel rounded-2xl p-6 border border-gray-700/50 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">{t('key.title')}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-gray-400 leading-relaxed mb-4">{t('key.desc')}</p>

        {existing && (
          <div className="mb-3 text-[11px] font-mono text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
            {t('key.saved')}: {maskKey(existing)}
          </div>
        )}

        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder={existing ? t('key.placeholder_replace') : 'AIza...'}
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-3 pr-16 py-2.5 text-sm font-mono text-gray-100 outline-none focus:border-primary-500"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-gray-400 hover:text-white px-2 py-1"
          >
            {show ? t('key.hide') : t('key.show')}
          </button>
        </div>

        <label className="flex items-center gap-2 mt-3 text-xs text-gray-300 cursor-pointer">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          {t('key.remember')}
        </label>
        <p className="text-[10px] text-gray-500 mt-1 ml-6">{t('key.remember_hint')}</p>

        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 text-xs text-primary-400 hover:text-primary-300 underline underline-offset-2"
        >
          {t('key.get')}
        </a>

        <div className="flex gap-3 mt-6">
          {existing && (
            <button
              onClick={handleDelete}
              className="py-2.5 px-4 rounded-xl text-sm font-semibold text-rose-300 border border-rose-500/30 hover:bg-rose-500/10"
            >
              {t('key.delete')}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!value.trim()}
            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-purple-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('key.save')}
          </button>
        </div>

        <p className="text-[10px] text-gray-500 mt-4 leading-relaxed">{t('key.privacy')}</p>
      </div>
    </div>
  );
};

export default ApiKeyModal;
