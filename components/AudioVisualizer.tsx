import React, { useEffect, useRef, useState } from 'react';
import { PlayIcon, PauseIcon, ArrowPathIcon } from './Icons';
import { MasteringParams } from '../types';
import { createMasteringGraph, AudioGraph } from '../services/audioEngine';
import { useLanguage } from '../contexts/LanguageContext';

interface AudioVisualizerProps {
  audioUrl: string;
  label?: string;
  variant?: 'default' | 'muted';
  masteringParams?: MasteringParams | null;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ 
  audioUrl, 
  label, 
  variant = 'default',
  masteringParams
}) => {
  const { t } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Real-time FX State
  const [isFxEnabled, setIsFxEnabled] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  // Web Audio API refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const graphRef = useRef<AudioGraph | null>(null);
  const animationRef = useRef<number>(0);

  // Initialize Audio
  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  // Handle Real-time Params Update
  useEffect(() => {
    if (graphRef.current && masteringParams && isFxEnabled) {
      graphRef.current.updateParams(masteringParams);
    }
  }, [masteringParams, isFxEnabled]);

  // Setup Visualizer & Audio Graph
  const initAudioSystem = () => {
    if (audioContextRef.current) return;

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContext();
    audioContextRef.current = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyserRef.current = analyser;

    if (audioRef.current) {
      const source = ctx.createMediaElementSource(audioRef.current);
      sourceRef.current = source;
      
      // Initial Connection (Dry)
      connectGraph(ctx, source, analyser, false);
    }
  };

  const connectGraph = (
    ctx: AudioContext, 
    source: MediaElementAudioSourceNode, 
    analyser: AnalyserNode,
    enableFx: boolean
  ) => {
    // Disconnect everything first
    try { source.disconnect(); } catch (e) {}
    if (graphRef.current) {
      try { graphRef.current.output.disconnect(); } catch (e) {}
    }

    if (enableFx && masteringParams) {
      // WET PATH: Source -> FX Graph -> Analyser -> Destination
      if (!graphRef.current) {
        graphRef.current = createMasteringGraph(ctx, masteringParams);
      } else {
        // Ensure params are up to date when switching on
        graphRef.current.updateParams(masteringParams);
      }
      
      source.connect(graphRef.current.input);
      graphRef.current.output.connect(analyser);
    } else {
      // DRY PATH: Source -> Analyser -> Destination
      source.connect(analyser);
    }

    analyser.connect(ctx.destination);
  };

  // Toggle FX Handler
  const toggleFx = async () => {
    if (!audioContextRef.current) initAudioSystem();
    if (audioContextRef.current?.state === 'suspended') await audioContextRef.current.resume();

    const newFxState = !isFxEnabled;
    setIsFxEnabled(newFxState);

    if (audioContextRef.current && sourceRef.current && analyserRef.current) {
      connectGraph(audioContextRef.current, sourceRef.current, analyserRef.current, newFxState);
    }
  };

  const draw = () => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;

    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 2;
    
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    
    if (variant === 'default') {
      // Change color based on FX state
      if (isFxEnabled) {
        gradient.addColorStop(0, '#f472b6'); // pink-400
        gradient.addColorStop(0.5, '#fb7185'); // rose-400
        gradient.addColorStop(1, '#facc15'); // yellow-400
        ctx.shadowColor = 'rgba(244, 114, 182, 0.5)';
      } else {
        gradient.addColorStop(0, '#818cf8'); // primary-400
        gradient.addColorStop(0.5, '#c084fc'); // purple-400
        gradient.addColorStop(1, '#22d3ee'); // cyan-400
        ctx.shadowColor = 'rgba(99, 102, 241, 0.5)';
      }
      ctx.shadowBlur = 8;
    } else {
      gradient.addColorStop(0, '#4b5563');
      gradient.addColorStop(1, '#9ca3af');
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
    }
    
    ctx.strokeStyle = gradient;
    ctx.beginPath();

    const sliceWidth = width * 1.0 / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * height / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    animationRef.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    if (isPlaying) {
      draw();
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, isFxEnabled]);

  const togglePlay = async () => {
    if (!audioRef.current) return;

    if (!audioContextRef.current) {
      initAudioSystem();
    }

    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      await audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !audioRef.current || duration === 0) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.min(Math.max(x / width, 0), 1);
    
    const newTime = percentage * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleResetPlayback = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const progressPercentage = (currentTime / (duration || 1)) * 100;

  return (
    <div className="w-full flex flex-col gap-3">
      <audio ref={audioRef} src={audioUrl} crossOrigin="anonymous" />

      {/* Label & Controls Row */}
      <div className="flex items-center justify-between">
        {label && (
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold font-mono uppercase tracking-widest px-2 py-0.5 rounded-sm ${variant === 'default' ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
              {label}
            </span>
          </div>
        )}

        {/* Real-time FX Toggle (Only if params are provided and variant is default) */}
        {masteringParams && variant === 'default' && (
          <button
            onClick={toggleFx}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all duration-300
              ${isFxEnabled 
                ? 'bg-gradient-to-r from-rose-600 to-pink-500 text-white border border-rose-400/50 shadow-[0_0_20px_rgba(244,63,94,0.4)] scale-105' 
                : 'bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-gray-200'
              }
            `}
          >
            <span className={`w-2 h-2 rounded-full transition-colors ${isFxEnabled ? 'bg-white animate-pulse shadow-[0_0_8px_white]' : 'bg-gray-600'}`}></span>
            {isFxEnabled ? t('visualizer.fx_on') : t('visualizer.fx_off')}
          </button>
        )}
      </div>

      {/* Visualizer Area */}
      <div className={`relative w-full h-32 rounded-xl border overflow-hidden group transition-all duration-500 ${variant === 'default' ? 'bg-gray-950/60 border-gray-700/50 shadow-inner' : 'bg-gray-900/30 border-gray-800/50 grayscale opacity-70'}`}>
        <canvas 
          ref={canvasRef} 
          width={600} 
          height={128}
          className="w-full h-full relative z-10"
        />
        <div className="absolute inset-0 opacity-10 pointer-events-none z-0" 
             style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        </div>
        {!isPlaying && currentTime === 0 && (
           <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] z-20">
             <button 
               onClick={togglePlay}
               className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 ${variant === 'default' ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-primary-500/40 border border-primary-400/50' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
             >
               <PlayIcon className="w-6 h-6 ml-1" />
             </button>
           </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 px-1">
        
        {/* Reset Button */}
        <button 
          onClick={handleResetPlayback}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors border ${variant === 'default' ? 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border-gray-600' : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-500 hover:text-gray-300 border-gray-700/50'}`}
          title={t('visualizer.reset')}
        >
          <ArrowPathIcon className="w-4 h-4" />
        </button>

        <button 
          onClick={togglePlay}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors border ${variant === 'default' ? 'bg-gray-800 hover:bg-gray-700 text-white border-gray-600' : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 border-gray-700/50'}`}
        >
          {isPlaying ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4 ml-0.5" />}
        </button>

        <div className="flex-1 flex flex-col gap-1.5 group/progress">
           {/* Interactive Progress Bar */}
           <div 
             ref={progressBarRef}
             onClick={handleSeek}
             className="relative h-4 w-full flex items-center cursor-pointer"
           >
             {/* Track Background */}
             <div className="absolute inset-0 m-auto h-1.5 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-800/50">
               {/* Progress Fill */}
               <div 
                 className={`h-full relative transition-colors duration-500 ${variant === 'default' ? (isFxEnabled ? 'bg-gradient-to-r from-rose-500 to-yellow-500' : 'bg-gradient-to-r from-primary-500 to-cyan-400') : 'bg-gray-600'}`}
                 style={{ width: `${progressPercentage}%` }}
               >
               </div>
             </div>
             
             {/* Thumb Indicator (Visible on Hover) */}
             <div 
               className={`absolute w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] opacity-0 group-hover/progress:opacity-100 transition-opacity pointer-events-none transform -translate-x-1/2`}
               style={{ left: `${progressPercentage}%` }}
             />
           </div>

           <div className="flex justify-between text-[10px] text-gray-500 font-mono tracking-tight -mt-1">
             <span>{formatTime(currentTime)}</span>
             <span>{formatTime(duration)}</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AudioVisualizer;