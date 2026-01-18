import React from 'react';
import { BatchItem } from '../types';
import { XMarkIcon, FileIcon } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';

interface BatchQueueProps {
  items: BatchItem[];
  onRemove: (id: string) => void;
  isProcessing: boolean;
}

const BatchQueue: React.FC<BatchQueueProps> = ({ items, onRemove, isProcessing }) => {
  const { t } = useLanguage();
  
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full glass-panel rounded-2xl p-6 mt-6 border border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
          {t('batch.title')}
          <span className="bg-gray-800/80 text-gray-300 text-[10px] font-mono px-2 py-0.5 rounded border border-gray-600">
            {items.length} {t('batch.files')}
          </span>
        </h3>
        
        {/* Progress Summary */}
        {isProcessing && (
           <span className="text-xs font-mono text-primary-400 animate-pulse font-bold">
             PROCESSING_THREAD... {items.filter(i => i.status === 'COMPLETED').length}/{items.length}
           </span>
        )}
      </div>

      <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {items.map((item) => (
          <div 
            key={item.id}
            className={`
              relative flex items-center justify-between p-4 rounded-xl border transition-all overflow-hidden
              ${item.status === 'PROCESSING' ? 'bg-primary-900/10 border-primary-500/40 shadow-[0_0_15px_-5px_rgba(99,102,241,0.2)]' : ''}
              ${item.status === 'COMPLETED' ? 'bg-green-900/10 border-green-500/20' : ''}
              ${item.status === 'IDLE' ? 'bg-gray-800/30 border-gray-700/50 hover:bg-gray-800/50' : ''}
              ${item.status === 'ERROR' ? 'bg-red-900/10 border-red-500/30' : ''}
            `}
          >
            <div className="flex items-center gap-3 overflow-hidden z-10">
               <div className={`
                 p-2 rounded-lg
                 ${item.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400 shadow-[0_0_10px_rgba(74,222,128,0.2)]' : 'bg-gray-800 text-gray-400'}
                 ${item.status === 'PROCESSING' ? 'animate-pulse bg-primary-500/20 text-primary-300' : ''}
               `}>
                 <FileIcon className="w-5 h-5" />
               </div>
               <div className="min-w-0">
                 <p className="text-sm font-semibold text-gray-200 truncate pr-4">{item.file.name}</p>
                 <p className="text-[10px] text-gray-500 font-mono">{formatSize(item.file.size)}</p>
               </div>
            </div>

            <div className="flex items-center gap-3 z-10">
              {/* Status Indicator */}
              {item.status === 'IDLE' && <span className="text-[10px] uppercase font-bold text-gray-600">{t('batch.queued')}</span>}
              {item.status === 'PROCESSING' && (
                <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-primary-400">
                  <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('batch.processing')}
                </div>
              )}
              {item.status === 'COMPLETED' && (
                <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-green-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {t('batch.done')}
                </span>
              )}
              {item.status === 'ERROR' && <span className="text-[10px] uppercase font-bold text-red-400">{t('batch.failed')}</span>}

              {/* Remove Button (Only if not processing) */}
              <button 
                onClick={() => onRemove(item.id)}
                disabled={isProcessing}
                className="p-1.5 hover:bg-gray-700/80 rounded-lg text-gray-500 hover:text-white transition-colors disabled:opacity-0"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            
            {/* Progress Bar Background for processing item */}
            {item.status === 'PROCESSING' && (
              <div className="absolute top-0 bottom-0 left-0 bg-primary-500/5 animate-[pulse_2s_ease-in-out_infinite] w-full z-0"></div>
            )}
             {/* Bottom progress line */}
            {item.status === 'PROCESSING' && (
              <div className="absolute bottom-0 left-0 h-[2px] bg-primary-500 animate-[width_2s_ease-in-out_infinite] shadow-[0_0_10px_#6366f1]" style={{width: '100%'}}></div>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-center text-gray-600 font-mono text-xs py-10 uppercase tracking-widest opacity-50">{t('batch.empty')}</p>
        )}
      </div>
    </div>
  );
};

export default BatchQueue;