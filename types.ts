export interface AudioFileState {
  file: File | null;
  name: string;
  size: number;
  type: string;
  url: string | null;
}

export interface BatchItem {
  id: string;
  file: File;
  status: 'IDLE' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
  processedBlob: Blob | null;
}

export enum AppStatus {
  IDLE = 'IDLE',
  FILE_LOADED = 'FILE_LOADED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
  BATCH_MODE = 'BATCH_MODE'
}

export type BitDepth = 16 | 24 | 32;

export interface OutputParams {
  /** Pre-limiter gain in dB (drives the limiter, like a maximizer) */
  gain: number;
  /** Limiter ceiling in dBFS */
  ceiling: number;
  /** If set, auto-adjust gain so the integrated loudness hits this LUFS value */
  targetLufs: number | null;
  /** WAV export bit depth (32 = float) */
  bitDepth: BitDepth;
}

export interface MasteringParams {
  eq: {
    lowGain: number;
    midGain: number;
    highGain: number;
  };
  compressor: {
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
    /** Knee width in dB (default 30) */
    knee?: number;
    /** Make-up gain in dB (default 0) */
    makeup?: number;
  };
  stereoWidth: number;
  /** High-pass (low cut) frequency in Hz, 0 = off */
  lowCut?: number;
  output?: OutputParams;
}

export const DEFAULT_OUTPUT: OutputParams = {
  gain: 0,
  ceiling: -1,
  targetLufs: null,
  bitDepth: 16,
};

export interface LoudnessStats {
  /** Integrated loudness (LUFS), -Infinity if silent */
  lufs: number;
  /** Sample peak in dBFS */
  samplePeakDb: number;
  /** Approximate true peak (4x oversampled) in dBTP */
  truePeakDb: number;
  /** Peak-to-loudness ratio, a dynamic range indicator (dB) */
  plr: number;
}

export interface MasteringResult {
  blob: Blob;
  input: LoudnessStats;
  output: LoudnessStats;
  /** Output gain finally applied (dB), differs from the setting when targeting LUFS */
  appliedGain: number;
}
