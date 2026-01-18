import React, { useState, useRef, useCallback } from 'react';
import { UploadIcon, FileIcon } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';

interface FileUploaderProps {
  onFileSelect: (files: File[]) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect }) => {
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndPassFiles = (fileList: FileList | File[]) => {
    const validFiles: File[] = [];
    let hasInvalid = false;

    Array.from(fileList).forEach(file => {
      if (file.type === 'audio/wav' || file.type === 'audio/x-wav' || file.name.endsWith('.wav')) {
        validFiles.push(file);
      } else {
        hasInvalid = true;
      }
    });

    if (hasInvalid) {
      setErrorMsg(t('upload.error'));
    } else {
      setErrorMsg(null);
    }

    if (validFiles.length > 0) {
      onFileSelect(validFiles);
    }
  };

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndPassFiles(e.dataTransfer.files);
    }
  }, [onFileSelect]);

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndPassFiles(e.target.files);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-2xl mx-auto perspective-1000">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={triggerFileInput}
        className={`
          relative group cursor-pointer
          flex flex-col items-center justify-center
          h-80 w-full rounded-3xl
          glass-panel
          transition-all duration-500 ease-out
          ${isDragging 
            ? 'border-primary-500/50 bg-primary-900/20 shadow-[0_0_50px_-10px_rgba(99,102,241,0.3)] scale-[1.02]' 
            : 'hover:border-primary-500/30 hover:bg-gray-800/40'
          }
        `}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileInputChange}
          accept=".wav"
          className="hidden"
          multiple
        />

        {/* Inner Content */}
        <div className="flex flex-col items-center gap-6 p-6 text-center z-10">
          <div className={`
            relative p-6 rounded-full transition-all duration-500
            ${isDragging ? 'text-white' : 'text-gray-400 group-hover:text-primary-400'}
          `}>
             {/* Glow behind icon */}
             <div className={`absolute inset-0 bg-primary-500 blur-2xl transition-opacity duration-500 rounded-full ${isDragging ? 'opacity-40' : 'opacity-0 group-hover:opacity-20'}`}></div>
            
            {isDragging ? (
               <FileIcon className="w-12 h-12 relative z-10 animate-bounce" />
            ) : (
               <UploadIcon className="w-12 h-12 relative z-10" />
            )}
          </div>

          <div className="space-y-3">
            <h3 className={`text-2xl font-bold tracking-tight transition-colors ${isDragging ? 'text-primary-400 text-glow' : 'text-white'}`}>
              {isDragging ? t('upload.active') : t('upload.idle')}
            </h3>
            <p className="text-gray-400 max-w-xs mx-auto text-sm leading-relaxed font-medium">
              {t('upload.desc')} <br/>
              <span className="text-primary-400 underline decoration-primary-500/30 underline-offset-4 group-hover:text-primary-300 transition-colors">
                {t('upload.browse')}
              </span>
            </p>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-950/50 border border-gray-800 text-xs text-gray-500 font-mono tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></span>
            {t('upload.support')}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-4 p-4 rounded-xl bg-red-950/30 border border-red-500/30 text-red-400 flex items-center justify-center animate-pulse backdrop-blur-md">
          <p className="text-sm font-medium font-mono">⚠️ {errorMsg}</p>
        </div>
      )}
    </div>
  );
};

export default FileUploader;