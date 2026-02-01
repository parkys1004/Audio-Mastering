import { MasteringParams } from '../types';

// Helper to write string to DataView
function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Minimal WAV Encoder
function bufferToWav(buffer: AudioBuffer, len: number): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = len * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // write RIFF chunk
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + len * numOfChan * 2, true);
  writeString(view, 8, 'WAVE');
  
  // write fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numOfChan, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * 2 * numOfChan, true);
  view.setUint16(32, numOfChan * 2, true);
  view.setUint16(34, 16, true);

  // write data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, len * numOfChan * 2, true);

  // write interleaved data
  for (i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  offset = 44;
  while (pos < len) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit
      view.setInt16(offset, sample, true);
      offset += 2;
    }
    pos++;
  }

  return new Blob([bufferArray], { type: 'audio/wav' });
}

export interface AudioGraph {
  input: AudioNode;
  output: AudioNode;
  updateParams: (params: MasteringParams) => void;
}

/**
 * Creates the audio processing graph (EQ -> Compressor -> Imager -> Limiter)
 * Works for both Real-time AudioContext and OfflineAudioContext.
 */
export const createMasteringGraph = (ctx: BaseAudioContext, params: MasteringParams): AudioGraph => {
  // 1. 3-Band EQ
  // Low Shelf
  const lowShelf = ctx.createBiquadFilter();
  lowShelf.type = 'lowshelf';
  lowShelf.frequency.value = 100;
  lowShelf.gain.value = params.eq.lowGain;

  // Mid Peaking
  const midPeak = ctx.createBiquadFilter();
  midPeak.type = 'peaking';
  midPeak.frequency.value = 1000;
  midPeak.Q.value = 1.0;
  midPeak.gain.value = params.eq.midGain;

  // High Shelf
  const highShelf = ctx.createBiquadFilter();
  highShelf.type = 'highshelf';
  highShelf.frequency.value = 10000;
  highShelf.gain.value = params.eq.highGain;

  // 2. Compressor (Glue)
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = params.compressor.threshold;
  compressor.knee.value = 30;
  compressor.ratio.value = params.compressor.ratio;
  compressor.attack.value = params.compressor.attack;
  compressor.release.value = params.compressor.release;

  // 3. Stereo Imager (Mid-Side Processing)
  // Logic: M = (L+R)*0.5, S = (L-R)*0.5
  // We apply 0.5 gain to inputs of MS matrix to prevent clipping when summing
  const msInputGain = ctx.createGain();
  msInputGain.gain.value = 0.5; // Correction to prevent 6dB boost

  const splitter = ctx.createChannelSplitter(2);
  const merger = ctx.createChannelMerger(2);
  
  // Gain nodes for matrix
  const midGain = ctx.createGain(); // For M channel
  const sideGain = ctx.createGain(); // For S channel (Controls Width)
  sideGain.gain.value = params.stereoWidth;

  // Inverter for MS encoding/decoding
  const inverter = ctx.createGain();
  inverter.gain.value = -1;

  // 4. Limiter (Brickwall-ish)
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -0.5; // Ceiling
  limiter.knee.value = 0.0; // Hard knee
  limiter.ratio.value = 20.0; // Limiting ratio
  limiter.attack.value = 0.001; // Fast attack
  limiter.release.value = 0.1;

  // === Wiring the Graph ===
  
  // Chain: Input -> EQ -> Compressor -> Gain Correction -> Splitter
  lowShelf.connect(midPeak);
  midPeak.connect(highShelf);
  highShelf.connect(compressor);
  compressor.connect(msInputGain);
  msInputGain.connect(splitter);

  // MS Encoding & Processing
  // Mid = L + R
  splitter.connect(midGain, 0); 
  splitter.connect(midGain, 1);
  
  // Side = L - R
  splitter.connect(sideGain, 0);
  splitter.connect(inverter, 1);
  inverter.connect(sideGain);

  // MS Decoding
  // L = Mid + Side
  midGain.connect(merger, 0, 0);
  sideGain.connect(merger, 0, 0);
  
  // R = Mid - Side
  midGain.connect(merger, 0, 1);
  // We need to invert side again for the Right channel
  const sideInverterForDecoding = ctx.createGain();
  sideInverterForDecoding.gain.value = -1;
  sideGain.connect(sideInverterForDecoding);
  sideInverterForDecoding.connect(merger, 0, 1);

  // Final Chain: Merger -> Limiter -> Output
  merger.connect(limiter);

  // Function to update params in real-time
  const updateParams = (newParams: MasteringParams) => {
    // EQ
    lowShelf.gain.setTargetAtTime(newParams.eq.lowGain, ctx.currentTime, 0.1);
    midPeak.gain.setTargetAtTime(newParams.eq.midGain, ctx.currentTime, 0.1);
    highShelf.gain.setTargetAtTime(newParams.eq.highGain, ctx.currentTime, 0.1);

    // Compressor
    compressor.threshold.setTargetAtTime(newParams.compressor.threshold, ctx.currentTime, 0.1);
    compressor.ratio.setTargetAtTime(newParams.compressor.ratio, ctx.currentTime, 0.1);
    compressor.attack.setTargetAtTime(newParams.compressor.attack, ctx.currentTime, 0.1);
    compressor.release.setTargetAtTime(newParams.compressor.release, ctx.currentTime, 0.1);

    // Imager
    sideGain.gain.setTargetAtTime(newParams.stereoWidth, ctx.currentTime, 0.1);
  };

  return {
    input: lowShelf,
    output: limiter,
    updateParams
  };
};

export const processAudio = async (file: File, params: MasteringParams): Promise<Blob> => {
  const arrayBuffer = await file.arrayBuffer();
  const tempCtx = new AudioContext();
  const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);

  // Use OfflineAudioContext for faster-than-realtime processing
  const offlineCtx = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );

  // 1. Source
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;

  // 2. Create Graph
  const graph = createMasteringGraph(offlineCtx, params);

  // 3. Connect
  source.connect(graph.input);
  graph.output.connect(offlineCtx.destination);

  // Start Rendering
  source.start(0);
  const renderedBuffer = await offlineCtx.startRendering();

  return bufferToWav(renderedBuffer, renderedBuffer.length);
};