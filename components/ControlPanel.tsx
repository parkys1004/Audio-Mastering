import React from 'react';
import { MasteringParams } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface ControlPanelProps {
  params: MasteringParams;
  onChange: (params: MasteringParams) => void;
  disabled?: boolean;
}

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (val: number) => void;
  disabled?: boolean;
}> = ({ label, value, min, max, step, unit = '', onChange, disabled }) => (
  <div className="flex flex-col gap-3 group">
    <div className="flex justify-between items-end">
      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest group-hover:text-gray-300 transition-colors">{label}</span>
      <span className="text-xs font-mono text-primary-300 bg-primary-900/20 px-2 py-0.5 rounded border border-primary-500/10 shadow-[0_0_10px_rgba(99,102,241,0.1)]">
        {value.toFixed(step < 0.1 ? 3 : 1)}{unit}
      </span>
    </div>
    <div className="relative h-6 flex items-center">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full z-10 disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  </div>
);

const ControlModule: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-700/50 pb-3 mb-1 flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-sm bg-primary-500/50"></div>
      {title}
    </h4>
    {children}
  </div>
);

const ControlPanel: React.FC<ControlPanelProps> = ({ params, onChange, disabled }) => {
  const { t } = useLanguage();

  const updateEQ = (key: keyof MasteringParams['eq'], val: number) => {
    onChange({
      ...params,
      eq: { ...params.eq, [key]: val }
    });
  };

  const updateComp = (key: keyof MasteringParams['compressor'], val: number) => {
    onChange({
      ...params,
      compressor: { ...params.compressor, [key]: val }
    });
  };

  return (
    <div className="w-full glass-panel rounded-3xl p-8 mt-8 border border-gray-700/50">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1.5 bg-gradient-to-b from-primary-400 to-primary-600 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
          <h3 className="text-xl font-bold text-white tracking-tight">{t('controls.title')}</h3>
        </div>
        <div className="text-[10px] font-mono text-gray-500 border border-gray-800 rounded px-2 py-1">
          MASTER_BUS_01
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Equalizer Section */}
        <ControlModule title={t('controls.eq')}>
          <Slider 
            label="Low Shelf (100Hz)" 
            value={params.eq.lowGain} 
            min={-12} max={12} step={0.5} unit="dB"
            onChange={(v) => updateEQ('lowGain', v)}
            disabled={disabled}
          />
          <Slider 
            label="Mid Peak (1kHz)" 
            value={params.eq.midGain} 
            min={-12} max={12} step={0.5} unit="dB"
            onChange={(v) => updateEQ('midGain', v)}
            disabled={disabled}
          />
          <Slider 
            label="High Shelf (10kHz)" 
            value={params.eq.highGain} 
            min={-12} max={12} step={0.5} unit="dB"
            onChange={(v) => updateEQ('highGain', v)}
            disabled={disabled}
          />
        </ControlModule>

        {/* Dynamics Section */}
        <ControlModule title={t('controls.dynamics')}>
          <Slider 
            label="Threshold" 
            value={params.compressor.threshold} 
            min={-60} max={0} step={1} unit="dB"
            onChange={(v) => updateComp('threshold', v)}
            disabled={disabled}
          />
          <Slider 
            label="Ratio" 
            value={params.compressor.ratio} 
            min={1} max={20} step={0.5} unit=":1"
            onChange={(v) => updateComp('ratio', v)}
            disabled={disabled}
          />
          <div className="grid grid-cols-2 gap-4">
            <Slider 
              label="Attack" 
              value={params.compressor.attack} 
              min={0.001} max={0.1} step={0.001} unit="s"
              onChange={(v) => updateComp('attack', v)}
              disabled={disabled}
            />
            <Slider 
              label="Release" 
              value={params.compressor.release} 
              min={0.01} max={1} step={0.01} unit="s"
              onChange={(v) => updateComp('release', v)}
              disabled={disabled}
            />
          </div>
        </ControlModule>

        {/* Imaging Section */}
        <ControlModule title={t('controls.imager')}>
          <Slider 
            label="Width Factor" 
            value={params.stereoWidth} 
            min={0} max={2} step={0.1} unit="x"
            onChange={(v) => onChange({ ...params, stereoWidth: v })}
            disabled={disabled}
          />
          <div className="mt-4 p-4 rounded-xl bg-gray-950/40 border border-gray-800">
             <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-2">
                <span>{t('controls.mono')}</span>
                <span>{t('controls.stereo')}</span>
                <span>{t('controls.wide')}</span>
             </div>
             {/* Visual representation of width */}
             <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-300"
                 style={{ width: `${(params.stereoWidth / 2) * 100}%` }}
               ></div>
             </div>
             <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">
               {t('controls.imager.desc')}
             </p>
          </div>
        </ControlModule>
      </div>
    </div>
  );
};

export default ControlPanel;