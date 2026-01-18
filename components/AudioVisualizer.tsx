import React, { useEffect, useRef, useState } from 'react';
import { PlayIcon, PauseIcon } from './Icons';

interface AudioVisualizerProps {
  audioUrl: string;
  label?: string;
  variant?: 'default' | 'muted';
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ 
  audioUrl, 
  label, 
  variant = 'default' 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
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

  // Setup Visualizer
  const initVisualizer = () => {
    if (audioContextRef.current) return; // Already initialized

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContext();
    audioContextRef.current = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048; // Higher value = more detailed waveform
    analyserRef.current = analyser;

    if (audioRef.current) {
      // Connect audio element to analyser
      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      sourceRef.current = source;
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

    // Clear with a slight fade for trail effect or fully clear
    ctx.clearRect(0, 0, width, height);

    ctx.lineWidth = 2;
    
    // Gradient Stroke based on variant
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    
    if (variant === 'default') {
      gradient.addColorStop(0, '#818cf8'); // primary-400
      gradient.addColorStop(0.5, '#c084fc'); // purple-400
      gradient.addColorStop(1, '#22d3ee'); // cyan-400
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(99, 102, 241, 0.5)';
    } else {
      gradient.addColorStop(0, '#4b5563'); // gray-600
      gradient.addColorStop(1, '#9ca3af'); // gray-400
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
      // Start drawing loop
      draw();
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying]);

  const togglePlay = async () => {
    if (!audioRef.current) return;

    // Initialize Context on first user interaction
    if (!audioContextRef.current) {
      initVisualizer();
    }

    // Resume context if suspended (browser policy)
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

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Hidden Audio Element */}
      <audio ref={audioRef} src={audioUrl} crossOrigin="anonymous" />

      {/* Label Badge */}
      {label && (
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold font-mono uppercase tracking-widest px-2 py-0.5 rounded-sm ${variant === 'default' ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
            {label}
          </span>
        </div>
      )}

      {/* Visualizer Area */}
      <div className={`relative w-full h-32 rounded-xl border overflow-hidden group transition-all duration-500 ${variant === 'default' ? 'bg-gray-950/60 border-gray-700/50 shadow-inner' : 'bg-gray-900/30 border-gray-800/50 grayscale opacity-70'}`}>
        
        {/* Canvas */}
        <canvas 
          ref={canvasRef} 
          width={600} 
          height={128}
          className="w-full h-full relative z-10"
        />

        {/* Grid Background (DAW Style) */}
        <div className="absolute inset-0 opacity-10 pointer-events-none z-0" 
             style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        </div>

        {/* Play Overlay */}
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
      <div className="flex items-center gap-4 px-1">
        <button 
          onClick={togglePlay}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors border ${variant === 'default' ? 'bg-gray-800 hover:bg-gray-700 text-white border-gray-600' : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 border-gray-700/50'}`}
        >
          {isPlaying ? (
            <PauseIcon className="w-4 h-4" />
          ) : (
            <PlayIcon className="w-4 h-4 ml-0.5" />
          )}
        </button>

        {/* Progress Bar (Visual only for now, can be made interactive) */}
        <div className="flex-1 flex flex-col gap-1.5">
           <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-800/50">
             <div 
               className={`h-full relative ${variant === 'default' ? 'bg-gradient-to-r from-primary-500 to-cyan-400 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'bg-gray-600'}`}
               style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
             >
             </div>
           </div>
           <div className="flex justify-between text-[10px] text-gray-500 font-mono tracking-tight">
             <span>{formatTime(currentTime)}</span>
             <span>{formatTime(duration)}</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AudioVisualizer;