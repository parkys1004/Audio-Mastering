import React, { useState } from 'react';
import JSZip from 'jszip';
import Header from './components/Header';
import Footer from './components/Footer';
import FileUploader from './components/FileUploader';
import AudioVisualizer from './components/AudioVisualizer';
import ControlPanel from './components/ControlPanel';
import Presets from './components/Presets';
import AIPrompt from './components/AIPrompt';
import BatchQueue from './components/BatchQueue';
import { AppStatus, AudioFileState, MasteringParams, BatchItem } from './types';
import { XMarkIcon, MusicNoteIcon } from './components/Icons';
import { processAudio } from './services/audioEngine';
import { generateMasteringParams } from './services/aiMastering';
import { useLanguage } from './contexts/LanguageContext';

const DEFAULT_PARAMS: MasteringParams = {
  eq: {
    lowGain: 2.0,
    midGain: -1.0,
    highGain: 3.0,
  },
  compressor: {
    threshold: -24,
    ratio: 12,
    attack: 0.003,
    release: 0.25,
  },
  stereoWidth: 1.2,
};

const App: React.FC = () => {
  const { t } = useLanguage();
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  
  // Single File Mode State
  const [originalFile, setOriginalFile] = useState<AudioFileState | null>(null);
  const [masteredFile, setMasteredFile] = useState<AudioFileState | null>(null);

  // Batch Mode State
  const [batchQueue, setBatchQueue] = useState<BatchItem[]>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [params, setParams] = useState<MasteringParams>(DEFAULT_PARAMS);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const handleFileSelect = (files: File[]) => {
    if (files.length === 0) return;

    if (files.length === 1) {
      // Single File Mode
      const file = files[0];
      const newState: AudioFileState = {
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file)
      };
      
      setOriginalFile(newState);
      setMasteredFile(null);
      setBatchQueue([]); // Clear batch
      setStatus(AppStatus.FILE_LOADED);
    } else {
      // Batch Mode
      const newItems: BatchItem[] = files.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        status: 'IDLE',
        processedBlob: null
      }));
      
      setBatchQueue(newItems);
      setOriginalFile(null); // Clear single
      setMasteredFile(null);
      setStatus(AppStatus.BATCH_MODE);
    }
  };

  const handleReset = () => {
    if (originalFile?.url) URL.revokeObjectURL(originalFile.url);
    if (masteredFile?.url) URL.revokeObjectURL(masteredFile.url);
    
    setOriginalFile(null);
    setMasteredFile(null);
    setBatchQueue([]);
    setStatus(AppStatus.IDLE);
    setIsProcessing(false);
    setParams(DEFAULT_PARAMS);
    setActivePresetId(null);
  };

  const removeFromBatch = (id: string) => {
    const newQueue = batchQueue.filter(item => item.id !== id);
    setBatchQueue(newQueue);
    if (newQueue.length === 0) {
      setStatus(AppStatus.IDLE);
    }
  };

  const handleAIGeneration = async (prompt: string) => {
    try {
      setIsAiLoading(true);
      setActivePresetId(null); // Clear preset selection as AI overrides it
      const newParams = await generateMasteringParams(prompt);
      setParams(newParams);
    } catch (error) {
      console.error(error);
      alert("AI 설정을 불러오는 데 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handlePresetSelect = (id: string, newParams: MasteringParams) => {
    setParams(newParams);
    setActivePresetId(id);
  };

  const handleSingleMastering = async () => {
    if (!originalFile?.file) return;

    try {
      setIsProcessing(true);
      setStatus(AppStatus.PROCESSING);
      
      const processedBlob = await processAudio(originalFile.file, params);
      
      const masteredUrl = URL.createObjectURL(processedBlob);
      const newMasteredFile: AudioFileState = {
        file: null,
        name: `mastered_${originalFile.name}`,
        size: processedBlob.size,
        type: 'audio/wav',
        url: masteredUrl
      };
      
      if (masteredFile?.url) URL.revokeObjectURL(masteredFile.url);

      setMasteredFile(newMasteredFile);
      setStatus(AppStatus.COMPLETED);
    } catch (error) {
      console.error("Mastering failed:", error);
      setStatus(AppStatus.ERROR);
      alert("오디오 처리 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchProcessing = async () => {
    if (batchQueue.length === 0) return;
    
    setIsProcessing(true);
    
    // Process Sequentially
    const processedQueue = [...batchQueue];
    
    for (let i = 0; i < processedQueue.length; i++) {
      // Update status to processing
      processedQueue[i] = { ...processedQueue[i], status: 'PROCESSING' };
      setBatchQueue([...processedQueue]);

      try {
        const blob = await processAudio(processedQueue[i].file, params);
        processedQueue[i] = { 
          ...processedQueue[i], 
          status: 'COMPLETED', 
          processedBlob: blob 
        };
      } catch (e) {
        console.error(`Error processing file ${processedQueue[i].file.name}`, e);
        processedQueue[i] = { ...processedQueue[i], status: 'ERROR' };
      }
      
      // Update state after each file
      setBatchQueue([...processedQueue]);
    }

    setIsProcessing(false);
  };

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    let count = 0;

    batchQueue.forEach(item => {
      if (item.status === 'COMPLETED' && item.processedBlob) {
        zip.file(`mastered_${item.file.name}`, item.processedBlob);
        count++;
      }
    });

    if (count === 0) {
      alert("다운로드할 완료된 파일이 없습니다.");
      return;
    }

    try {
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mastered_tracks.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("ZIP Generation error", e);
      alert("ZIP 파일 생성 중 오류가 발생했습니다.");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Condition to check if all batch items are processed
  const isBatchComplete = batchQueue.length > 0 && batchQueue.every(i => i.status === 'COMPLETED' || i.status === 'ERROR');

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-primary-500/30 selection:text-white">
      <Header />

      <main className="flex-grow flex flex-col items-center justify-center p-6 relative overflow-hidden">
        
        {/* Ambient Background Gradient (Enhanced for Glassmorphism) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-600/10 pointer-events-none blur-[100px] rounded-full z-0 animate-pulse-slow" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-600/10 pointer-events-none blur-[120px] rounded-full z-0" />

        <div className="w-full max-w-5xl mx-auto z-10">
          
          {/* Headline */}
          <div className="text-center mb-12 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-900/50 backdrop-blur border border-gray-700/50 text-primary-400 text-[10px] font-bold uppercase tracking-widest mb-2 shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-400 shadow-[0_0_8px_#818cf8] animate-pulse"></span>
              {t('hero.badge')}
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white drop-shadow-2xl">
              {t('hero.title.p1')} <br className="md:hidden" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-cyan-400 text-glow">{t('hero.title.p2')}</span>
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
              {t('hero.subtitle')}
            </p>
          </div>

          {/* Main Interface Area */}
          <div className="relative perspective-1000">
            {status === AppStatus.IDLE ? (
              <FileUploader onFileSelect={handleFileSelect} />
            ) : (
              // Main Control Card (Shared for Single & Batch)
              <div className="w-full glass-panel rounded-3xl p-8 shadow-2xl animate-fade-in-up relative overflow-hidden backdrop-blur-2xl">
                
                {/* Processing Overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 z-50 bg-gray-950/80 backdrop-blur-md flex flex-col items-center justify-center rounded-3xl">
                    <div className="relative">
                      <div className="w-20 h-20 border-4 border-gray-800 rounded-full"></div>
                      <div className="absolute top-0 left-0 w-20 h-20 border-4 border-primary-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(99,102,241,0.5)]"></div>
                    </div>
                    <p className="text-white font-bold text-lg mt-6 tracking-wide animate-pulse text-glow">
                      {status === AppStatus.BATCH_MODE ? t('status.processing_batch') : t('status.processing_single')}
                    </p>
                    <p className="text-xs text-primary-400 font-mono mt-2">{t('status.dont_close')}</p>
                  </div>
                )}

                {/* Header Section of Card */}
                <div className="flex items-start justify-between mb-8 border-b border-gray-800/50 pb-6">
                  <div className="flex items-center gap-4">
                     {/* Icon changes based on mode */}
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-colors border border-white/10 ${status === AppStatus.COMPLETED || isBatchComplete ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'bg-gradient-to-br from-gray-800 to-gray-900'}`}>
                      <MusicNoteIcon className={`w-8 h-8 ${status === AppStatus.COMPLETED || isBatchComplete ? 'text-white' : 'text-primary-400'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-white truncate max-w-[200px] md:max-w-sm tracking-tight">
                          {status === AppStatus.BATCH_MODE || batchQueue.length > 0 ? t('status.batch_session') : originalFile?.name}
                        </h3>
                        {((status === AppStatus.COMPLETED) || isBatchComplete) && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-green-500/20 text-green-400 border border-green-500/30 uppercase tracking-wide shadow-[0_0_10px_rgba(74,222,128,0.2)]">
                            {t('status.ready')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 font-mono mt-1">
                        {status === AppStatus.BATCH_MODE || batchQueue.length > 0 
                          ? `${batchQueue.length} ${t('status.items_queued')}` 
                          : `${originalFile && formatFileSize(originalFile.size)} • WAV • 44.1kHz`
                        }
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={handleReset}
                    className="p-2.5 rounded-xl hover:bg-gray-800 text-gray-500 hover:text-white transition-colors border border-transparent hover:border-gray-700"
                    title="Close Session"
                    disabled={isProcessing}
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* --- SINGLE FILE VIEW --- */}
                {status !== AppStatus.BATCH_MODE && batchQueue.length === 0 && (
                  <>
                    <div className="mb-8 space-y-4">
                      {originalFile?.url && (
                        <AudioVisualizer 
                          key={`original-${originalFile.url}`} 
                          audioUrl={originalFile.url}
                          label={masteredFile ? t('label.original') : t('label.preview')}
                          variant={masteredFile ? "muted" : "default"}
                        />
                      )}
                      {masteredFile?.url && (
                        <div className="relative animate-fade-in-up">
                          <div className="absolute -top-4 left-8 w-0.5 h-4 bg-gradient-to-b from-gray-800 to-primary-500/50"></div>
                          <AudioVisualizer 
                            key={`mastered-${masteredFile.url}`} 
                            audioUrl={masteredFile.url}
                            label={t('label.master')}
                            variant="default"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex gap-4">
                      <button 
                        onClick={handleReset}
                        disabled={isProcessing || isAiLoading}
                        className="flex-1 py-4 px-6 rounded-xl glass-button font-semibold text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('btn.change_file')}
                      </button>
                      
                      {status !== AppStatus.COMPLETED ? (
                        <button 
                          onClick={handleSingleMastering}
                          disabled={isProcessing || isAiLoading}
                          className="flex-[2] py-4 px-6 rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 font-bold text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none border border-white/10"
                        >
                          <span className="uppercase tracking-wider text-sm">{t('btn.process')}</span>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </button>
                      ) : (
                        <div className="flex-[2] flex gap-3">
                           <button
                              onClick={handleSingleMastering}
                              disabled={isProcessing || isAiLoading}
                              className="flex-1 py-4 px-4 rounded-xl glass-button font-semibold text-gray-300 hover:text-white flex items-center justify-center gap-2"
                            >
                              {t('btn.reprocess')}
                            </button>
                          <a 
                            href={masteredFile?.url || '#'}
                            download={masteredFile?.name || 'mastered.wav'}
                            className="flex-1 py-4 px-4 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 font-bold text-white shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] hover:scale-[1.01] transition-all flex items-center justify-center gap-2 border border-white/10"
                          >
                            <span className="uppercase tracking-wider text-sm">{t('btn.download')}</span>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </a>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* --- BATCH MODE VIEW --- */}
                {(status === AppStatus.BATCH_MODE || batchQueue.length > 0) && (
                  <>
                     <BatchQueue 
                        items={batchQueue} 
                        onRemove={removeFromBatch} 
                        isProcessing={isProcessing} 
                     />
                     
                     <div className="flex gap-4 mt-6">
                        <button 
                          onClick={handleReset}
                          disabled={isProcessing || isAiLoading}
                          className="flex-1 py-4 px-6 rounded-xl glass-button font-semibold text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {t('btn.cancel')}
                        </button>

                        {!isBatchComplete ? (
                          <button 
                            onClick={handleBatchProcessing}
                            disabled={isProcessing || isAiLoading || batchQueue.length === 0}
                            className="flex-[2] py-4 px-6 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 font-bold text-white shadow-[0_0_20px_rgba(8,145,178,0.4)] hover:shadow-[0_0_30px_rgba(8,145,178,0.6)] hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none border border-white/10"
                          >
                            <span className="uppercase tracking-wider text-sm">{t('btn.run_batch')}</span>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                          </button>
                        ) : (
                          <button 
                            onClick={handleDownloadZip}
                            className="flex-[2] py-4 px-6 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 font-bold text-white shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_rgba(34,197,94,0.6)] hover:scale-[1.01] transition-all flex items-center justify-center gap-2 border border-white/10"
                          >
                            <span className="uppercase tracking-wider text-sm">{t('btn.download_zip')}</span>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                        )}
                     </div>
                  </>
                )}

                {/* Shared AI & Control Panel */}
                <AIPrompt 
                  onGenerate={handleAIGeneration} 
                  isLoading={isAiLoading} 
                  disabled={isProcessing}
                />

                <Presets 
                  onSelect={handlePresetSelect} 
                  activePresetId={activePresetId}
                  disabled={isProcessing || isAiLoading} 
                />

                <ControlPanel 
                  params={params} 
                  onChange={setParams} 
                  disabled={isProcessing || isAiLoading}
                />

              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default App;