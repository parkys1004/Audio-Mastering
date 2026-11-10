import React from 'react';
import { LoudnessStats } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface LoudnessPanelProps {
  input: LoudnessStats | null;
  output?: LoudnessStats | null;
  appliedGain?: number;
  matchEnabled: boolean;
  onToggleMatch: (v: boolean) => void;
}

const fmt = (v: number, digits = 1) => (Number.isFinite(v) ? v.toFixed(digits) : '—');

const Cell: React.FC<{ label: string; value: string; unit: string; warn?: boolean }> = ({ label, value, unit, warn }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{label}</span>
    <span className={`text-sm font-mono ${warn ? 'text-rose-400' : 'text-gray-100'}`}>
      {value} <span className="text-[10px] text-gray-500">{unit}</span>
    </span>
  </div>
);

const Row: React.FC<{ title: string; stats: LoudnessStats; accent?: boolean }> = ({ title, stats, accent }) => {
  const { t } = useLanguage();
  return (
    <div className={`rounded-xl p-4 border ${accent ? 'bg-primary-500/5 border-primary-500/20' : 'bg-gray-950/40 border-gray-800'}`}>
      <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400 mb-3">{title}</div>
      <div className="grid grid-cols-3 gap-3">
        <Cell label={t('meter.lufs')} value={fmt(stats.lufs)} unit="LUFS" />
        <Cell label={t('meter.tp')} value={fmt(stats.truePeakDb)} unit="dBTP" warn={stats.truePeakDb > -0.1} />
        <Cell label={t('meter.plr')} value={fmt(stats.plr)} unit="dB" />
      </div>
    </div>
  );
};

const LoudnessPanel: React.FC<LoudnessPanelProps> = ({ input, output, appliedGain, matchEnabled, onToggleMatch }) => {
  const { t } = useLanguage();
  if (!input) return null;

  return (
    <div className="w-full mt-6 rounded-2xl glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-sm bg-primary-500/50"></div>
          {t('meter.title')}
        </h4>
        {output && appliedGain !== undefined && (
          <span className="text-[10px] font-mono text-gray-400">
            {t('meter.gain')}: {appliedGain >= 0 ? '+' : ''}
            {appliedGain.toFixed(1)} dB
          </span>
        )}
      </div>

      <div className={`grid gap-4 ${output ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
        <Row title={t('meter.before')} stats={input} />
        {output && <Row title={t('meter.after')} stats={output} accent />}
      </div>

      {output && (
        <label className="flex items-start gap-3 mt-4 cursor-pointer">
          <input
            type="checkbox"
            checked={matchEnabled}
            onChange={(e) => onToggleMatch(e.target.checked)}
            className="mt-0.5"
          />
          <span className="flex flex-col">
            <span className="text-xs font-bold text-gray-200">{t('meter.match')}</span>
            <span className="text-[10px] text-gray-500">{t('meter.match.desc')}</span>
          </span>
        </label>
      )}
    </div>
  );
};

export default LoudnessPanel;
