import { BitDepth, DEFAULT_OUTPUT, MasteringParams, MasteringResult, OutputParams } from '../types';
import { measureLoudness } from './loudness';

// ---------------------------------------------------------------------------
// Look-ahead brickwall limiter (AudioWorklet)
// ---------------------------------------------------------------------------
// A sliding-window minimum of the required gain, smoothed by a moving average of the
// same length, guarantees |output| <= ceiling (sample peak) with a smooth attack.
// Release is a one-pole recovery that can only ever lower the gain, so the guarantee holds.
const LIMITER_LOOKAHEAD_SEC = 0.005;
const LIMITER_RELEASE_SEC = 0.1;

const limiterWorkletSource = `
class LookaheadLimiter extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'ceiling', defaultValue: -1, minValue: -30, maxValue: 0, automationRate: 'k-rate' }];
  }
  constructor() {
    super();
    this.L = Math.max(2, Math.round(sampleRate * ${LIMITER_LOOKAHEAD_SEC}));
    this.cap = this.L + 2;
    this.dqV = new Float64Array(this.cap);
    this.dqI = new Float64Array(this.cap);
    this.head = 0;
    this.count = 0;
    this.mBuf = new Float64Array(this.L).fill(1);
    this.mSum = this.L;
    this.mPos = 0;
    this.relCoef = 1 - Math.exp(-1 / (${LIMITER_RELEASE_SEC} * sampleRate));
    this.gain = 1;
    this.n = 0;
    this.pos = 0;
    this.delay = [];
  }
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || input.length === 0) return true;
    const chs = input.length;
    while (this.delay.length < chs) this.delay.push(new Float32Array(this.L));
    const ceiling = Math.pow(10, parameters.ceiling[0] / 20);
    const L = this.L, cap = this.cap;
    const frames = input[0].length;
    for (let i = 0; i < frames; i++) {
      let peak = 0;
      for (let c = 0; c < chs; c++) {
        const a = Math.abs(input[c][i]);
        if (a > peak) peak = a;
      }
      const g = peak > ceiling ? ceiling / peak : 1;

      // sliding-window minimum (monotonic deque)
      while (this.count > 0 && this.dqV[(this.head + this.count - 1) % cap] >= g) this.count--;
      const tail = (this.head + this.count) % cap;
      this.dqV[tail] = g;
      this.dqI[tail] = this.n;
      this.count++;
      while (this.dqI[this.head] <= this.n - L) {
        this.head = (this.head + 1) % cap;
        this.count--;
      }
      const m = this.dqV[this.head];

      // moving average of the minimum
      this.mSum += m - this.mBuf[this.mPos];
      this.mBuf[this.mPos] = m;
      this.mPos = (this.mPos + 1) % L;
      let s = this.mSum / L;
      if (s > 1) s = 1;

      // release smoothing (never exceeds s)
      const rel = this.gain + (1 - this.gain) * this.relCoef;
      this.gain = s < rel ? s : rel;

      // delay line: write newest, read oldest (delay = L - 1 samples)
      for (let c = 0; c < chs; c++) {
        const d = this.delay[c];
        d[this.pos] = input[c][i];
        output[c][i] = d[(this.pos + 1) % L] * this.gain;
      }
      this.pos = (this.pos + 1) % L;
      this.n++;
    }
    return true;
  }
}
registerProcessor('lookahead-limiter', LookaheadLimiter);
`;

const limiterModuleLoaded = new WeakSet<BaseAudioContext>();

const ensureLimiterModule = async (ctx: BaseAudioContext): Promise<boolean> => {
  if (!ctx.audioWorklet) return false;
  if (limiterModuleLoaded.has(ctx)) return true;
  const url = URL.createObjectURL(new Blob([limiterWorkletSource], { type: 'application/javascript' }));
  try {
    await ctx.audioWorklet.addModule(url);
    limiterModuleLoaded.add(ctx);
    return true;
  } catch (e) {
    console.warn('AudioWorklet limiter unavailable, using fallback limiter.', e);
    return false;
  } finally {
    URL.revokeObjectURL(url);
  }
};

/** Samples of delay the limiter introduces (compensated when rendering offline). */
export const limiterLatencySamples = (sampleRate: number) =>
  Math.max(2, Math.round(sampleRate * LIMITER_LOOKAHEAD_SEC)) - 1;

// ---------------------------------------------------------------------------
// WAV encoder (16-bit w/ TPDF dither, 24-bit, 32-bit float)
// ---------------------------------------------------------------------------
function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function bufferToWav(buffer: AudioBuffer, offset: number, len: number, bitDepth: BitDepth): Blob {
  const numOfChan = buffer.numberOfChannels;
  const bytesPerSample = bitDepth / 8;
  const dataSize = len * numOfChan * bytesPerSample;
  const out = new ArrayBuffer(44 + dataSize);
  const view = new DataView(out);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, bitDepth === 32 ? 3 : 1, true); // 3 = IEEE float
  view.setUint16(22, numOfChan, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * bytesPerSample * numOfChan, true);
  view.setUint16(32, numOfChan * bytesPerSample, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numOfChan; c++) channels.push(buffer.getChannelData(c));

  let pos = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < numOfChan; c++) {
      const x = Math.max(-1, Math.min(1, channels[c][offset + i]));
      if (bitDepth === 32) {
        view.setFloat32(pos, x, true);
      } else if (bitDepth === 24) {
        const v = Math.round(x * 8388607);
        view.setUint8(pos, v & 0xff);
        view.setUint8(pos + 1, (v >> 8) & 0xff);
        view.setUint8(pos + 2, (v >> 16) & 0xff);
      } else {
        // TPDF dither (+-1 LSB) removes quantisation distortion at low levels
        const dither = (Math.random() - Math.random()) / 32768;
        const v = Math.round(Math.max(-1, Math.min(1, x + dither)) * 32767);
        view.setInt16(pos, v, true);
      }
      pos += bytesPerSample;
    }
  }

  return new Blob([out], { type: 'audio/wav' });
}

// ---------------------------------------------------------------------------
// Mastering graph
// ---------------------------------------------------------------------------
export interface AudioGraph {
  input: AudioNode;
  output: AudioNode;
  updateParams: (params: MasteringParams) => void;
}

const dbToGain = (db: number) => Math.pow(10, db / 20);

/**
 * Chain: Input -> Low cut -> EQ -> Compressor -> Make-up -> M/S Imager -> Output gain -> Limiter
 * Works for both real-time AudioContext and OfflineAudioContext.
 */
export const createMasteringGraph = async (
  ctx: BaseAudioContext,
  params: MasteringParams
): Promise<AudioGraph> => {
  const out: OutputParams = params.output ?? DEFAULT_OUTPUT;

  // 0. Low cut (high-pass)
  const lowCut = ctx.createBiquadFilter();
  lowCut.type = 'highpass';
  lowCut.Q.value = 0.707;
  lowCut.frequency.value = params.lowCut && params.lowCut > 0 ? params.lowCut : 5;

  // 1. 3-Band EQ
  const lowShelf = ctx.createBiquadFilter();
  lowShelf.type = 'lowshelf';
  lowShelf.frequency.value = 100;
  lowShelf.gain.value = params.eq.lowGain;

  const midPeak = ctx.createBiquadFilter();
  midPeak.type = 'peaking';
  midPeak.frequency.value = 1000;
  midPeak.Q.value = 1.0;
  midPeak.gain.value = params.eq.midGain;

  const highShelf = ctx.createBiquadFilter();
  highShelf.type = 'highshelf';
  highShelf.frequency.value = 10000;
  highShelf.gain.value = params.eq.highGain;

  // 2. Compressor (glue) + make-up gain
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = params.compressor.threshold;
  compressor.knee.value = params.compressor.knee ?? 30;
  compressor.ratio.value = params.compressor.ratio;
  compressor.attack.value = params.compressor.attack;
  compressor.release.value = params.compressor.release;

  const makeup = ctx.createGain();
  makeup.gain.value = dbToGain(params.compressor.makeup ?? 0);

  // 3. Stereo imager (Mid/Side). Always ends in a 2-channel signal.
  const msInputGain = ctx.createGain();
  msInputGain.gain.value = 0.5; // M = (L+R)/2, S = (L-R)/2 -> avoids +6 dB

  const splitter = ctx.createChannelSplitter(2);
  const merger = ctx.createChannelMerger(2);

  const midGain = ctx.createGain();
  const sideGain = ctx.createGain();
  sideGain.gain.value = params.stereoWidth;

  const inverter = ctx.createGain();
  inverter.gain.value = -1;
  const sideInverterForDecoding = ctx.createGain();
  sideInverterForDecoding.gain.value = -1;

  // 4. Output gain (drives the limiter) and limiter
  const outputGain = ctx.createGain();
  outputGain.gain.value = dbToGain(out.gain);

  let limiterNode: AudioNode;
  let setCeiling: (db: number) => void;
  const hasWorklet = await ensureLimiterModule(ctx);
  if (hasWorklet) {
    const node = new AudioWorkletNode(ctx, 'lookahead-limiter', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      channelCount: 2,
      channelCountMode: 'explicit',
    });
    node.parameters.get('ceiling')!.value = out.ceiling;
    limiterNode = node;
    setCeiling = (db) => node.parameters.get('ceiling')!.setTargetAtTime(db, ctx.currentTime, 0.05);
  } else {
    // Fallback: compressor-based limiter (can overshoot slightly)
    const fb = ctx.createDynamicsCompressor();
    fb.threshold.value = out.ceiling;
    fb.knee.value = 0;
    fb.ratio.value = 20;
    fb.attack.value = 0.001;
    fb.release.value = 0.1;
    limiterNode = fb;
    setCeiling = (db) => fb.threshold.setTargetAtTime(db, ctx.currentTime, 0.05);
  }

  // === Wiring ===
  lowCut.connect(lowShelf);
  lowShelf.connect(midPeak);
  midPeak.connect(highShelf);
  highShelf.connect(compressor);
  compressor.connect(makeup);
  makeup.connect(msInputGain);
  msInputGain.connect(splitter);

  // Mid = L + R
  splitter.connect(midGain, 0);
  splitter.connect(midGain, 1);
  // Side = L - R
  splitter.connect(sideGain, 0);
  splitter.connect(inverter, 1);
  inverter.connect(sideGain);

  // Decode: L = M + S, R = M - S
  midGain.connect(merger, 0, 0);
  sideGain.connect(merger, 0, 0);
  midGain.connect(merger, 0, 1);
  sideGain.connect(sideInverterForDecoding);
  sideInverterForDecoding.connect(merger, 0, 1);

  merger.connect(outputGain);
  outputGain.connect(limiterNode);

  const updateParams = (p: MasteringParams) => {
    const t = ctx.currentTime;
    const o = p.output ?? DEFAULT_OUTPUT;

    lowCut.frequency.setTargetAtTime(p.lowCut && p.lowCut > 0 ? p.lowCut : 5, t, 0.1);

    lowShelf.gain.setTargetAtTime(p.eq.lowGain, t, 0.1);
    midPeak.gain.setTargetAtTime(p.eq.midGain, t, 0.1);
    highShelf.gain.setTargetAtTime(p.eq.highGain, t, 0.1);

    compressor.threshold.setTargetAtTime(p.compressor.threshold, t, 0.1);
    compressor.knee.setTargetAtTime(p.compressor.knee ?? 30, t, 0.1);
    compressor.ratio.setTargetAtTime(p.compressor.ratio, t, 0.1);
    compressor.attack.setTargetAtTime(p.compressor.attack, t, 0.1);
    compressor.release.setTargetAtTime(p.compressor.release, t, 0.1);
    makeup.gain.setTargetAtTime(dbToGain(p.compressor.makeup ?? 0), t, 0.1);

    sideGain.gain.setTargetAtTime(p.stereoWidth, t, 0.1);

    outputGain.gain.setTargetAtTime(dbToGain(o.gain), t, 0.1);
    setCeiling(o.ceiling);
  };

  return { input: lowCut, output: limiterNode, updateParams };
};

// ---------------------------------------------------------------------------
// Offline rendering
// ---------------------------------------------------------------------------
const readWavSampleRate = (arrayBuffer: ArrayBuffer): number => {
  try {
    const view = new DataView(arrayBuffer);
    if (view.byteLength > 28 && view.getUint32(0, false) === 0x52494646) {
      const sr = view.getUint32(24, true);
      if (sr >= 8000 && sr <= 384000) return sr;
    }
  } catch {
    /* ignore */
  }
  return 44100;
};

const renderMaster = async (
  audioBuffer: AudioBuffer,
  params: MasteringParams
): Promise<{ rendered: AudioBuffer; latency: number }> => {
  const latency = limiterLatencySamples(audioBuffer.sampleRate);
  // Always render stereo: mono sources are up-mixed, the M/S imager needs 2 channels.
  const offlineCtx = new OfflineAudioContext(2, audioBuffer.length + latency, audioBuffer.sampleRate);

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;

  const graph = await createMasteringGraph(offlineCtx, params);
  source.connect(graph.input);
  graph.output.connect(offlineCtx.destination);

  source.start(0);
  const rendered = await offlineCtx.startRendering();
  return { rendered, latency };
};

const LUFS_TOLERANCE = 0.3;
const LUFS_MAX_PASSES = 4;

export const processAudio = async (file: File, params: MasteringParams): Promise<MasteringResult> => {
  const arrayBuffer = await file.arrayBuffer();
  const sampleRate = readWavSampleRate(arrayBuffer);

  // Decode at the file's own sample rate (no resampling to the device rate)
  const decodeCtx = new OfflineAudioContext(2, 1, sampleRate);
  const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer);

  const out: OutputParams = params.output ?? DEFAULT_OUTPUT;
  const inputStats = await measureLoudness(audioBuffer);

  let gain = out.gain;
  let { rendered, latency } = await renderMaster(audioBuffer, { ...params, output: { ...out, gain } });
  let outputStats = await measureLoudness(rendered, latency, audioBuffer.length);

  // Auto-gain towards the target loudness (limiter makes this non-linear, so iterate)
  if (out.targetLufs !== null && Number.isFinite(inputStats.lufs)) {
    for (let pass = 0; pass < LUFS_MAX_PASSES; pass++) {
      if (!Number.isFinite(outputStats.lufs)) break;
      const diff = out.targetLufs - outputStats.lufs;
      if (Math.abs(diff) <= LUFS_TOLERANCE) break;
      gain = Math.max(-24, Math.min(36, gain + diff));
      ({ rendered, latency } = await renderMaster(audioBuffer, { ...params, output: { ...out, gain } }));
      outputStats = await measureLoudness(rendered, latency, audioBuffer.length);
    }
  }

  const blob = bufferToWav(rendered, latency, audioBuffer.length, out.bitDepth);
  return { blob, input: inputStats, output: outputStats, appliedGain: gain };
};

/** Quick analysis of a file (used for AI context and the input meter). */
export const analyzeFile = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = new OfflineAudioContext(2, 1, readWavSampleRate(arrayBuffer));
  const buffer = await ctx.decodeAudioData(arrayBuffer);
  return measureLoudness(buffer);
};
