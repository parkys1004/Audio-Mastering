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
  };
  stereoWidth: number;
}