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

  // 2. 3-Band EQ
  // Low Shelf
  const lowShelf = offlineCtx.createBiquadFilter();
  lowShelf.type = 'lowshelf';
  lowShelf.frequency.value = 100;
  lowShelf.gain.value = params.eq.lowGain;

  // Mid Peaking
  const midPeak = offlineCtx.createBiquadFilter();
  midPeak.type = 'peaking';
  midPeak.frequency.value = 1000;
  midPeak.Q.value = 1.0;
  midPeak.gain.value = params.eq.midGain;

  // High Shelf
  const highShelf = offlineCtx.createBiquadFilter();
  highShelf.type = 'highshelf';
  highShelf.frequency.value = 10000;
  highShelf.gain.value = params.eq.highGain;

  // 3. Compressor (Glue)
  const compressor = offlineCtx.createDynamicsCompressor();
  compressor.threshold.value = params.compressor.threshold;
  compressor.knee.value = 30;
  compressor.ratio.value = params.compressor.ratio;
  compressor.attack.value = params.compressor.attack;
  compressor.release.value = params.compressor.release;

  // 4. Stereo Imager (Mid-Side Processing)
  // We need to split channels, process M/S, and merge back.
  // M = (L+R)/2, S = (L-R)/2
  // We will increase gain on S channel for width.
  
  // Note: For simplicity in node graph, we assume stereo input.
  const splitter = offlineCtx.createChannelSplitter(2);
  const merger = offlineCtx.createChannelMerger(2);
  
  // Gain nodes for matrix
  const midGain = offlineCtx.createGain(); // For M channel
  const sideGain = offlineCtx.createGain(); // For S channel (Controls Width)
  
  sideGain.gain.value = params.stereoWidth;

  // Matrix Math requires inversion for subtraction
  const inverter = offlineCtx.createGain();
  inverter.gain.value = -1;

  // 5. Limiter (Brickwall-ish)
  const limiter = offlineCtx.createDynamicsCompressor();
  limiter.threshold.value = -1.0; // Ceiling
  limiter.knee.value = 0.0; // Hard knee
  limiter.ratio.value = 20.0; // Limiting ratio
  limiter.attack.value = 0.001; // Fast attack
  limiter.release.value = 0.1;

  // === Wiring the Graph ===
  
  // Chain: Source -> EQ -> Compressor -> Splitter
  source.connect(lowShelf);
  lowShelf.connect(midPeak);
  midPeak.connect(highShelf);
  highShelf.connect(compressor);
  compressor.connect(splitter);

  // MS Matrix Encoding & Processing
  // Mid = L + R (We rely on summing behavior of connecting multiple outputs to one input)
  // Side = L - R
  
  // Connect L to Mid
  splitter.connect(midGain, 0); 
  // Connect R to Mid
  splitter.connect(midGain, 1);
  
  // Connect L to Side
  splitter.connect(sideGain, 0);
  // Connect R to Inverter -> Side
  splitter.connect(inverter, 1);
  inverter.connect(sideGain);

  // MS Matrix Decoding
  // L = Mid + Side
  // R = Mid - Side
  
  // To L Out
  midGain.connect(merger, 0, 0);
  sideGain.connect(merger, 0, 0);
  
  // To R Out
  midGain.connect(merger, 0, 1);
  sideGain.connect(merger, 0, 1); // We need to subtract side. Ideally we need another inverter.
  
  // Wait, the standard decoding is L = M + S, R = M - S.
  // So for Right channel, we need to invert Side again.
  const sideInverterForDecoding = offlineCtx.createGain();
  sideInverterForDecoding.gain.value = -1;
  sideGain.connect(sideInverterForDecoding);
  sideInverterForDecoding.connect(merger, 0, 1);

  // 6. Final Limiter
  // Connect Merger (Stereo Imager Output) -> Limiter -> Destination
  merger.connect(limiter);
  limiter.connect(offlineCtx.destination);

  // Start Rendering
  source.start(0);
  const renderedBuffer = await offlineCtx.startRendering();

  return bufferToWav(renderedBuffer, renderedBuffer.length);
};
