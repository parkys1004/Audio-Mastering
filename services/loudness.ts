import { LoudnessStats } from '../types';

const toDb = (x: number) => (x > 0 ? 20 * Math.log10(x) : -Infinity);

/**
 * K-weighting filter (ITU-R BS.1770) approximated with two biquads:
 *  1) high-shelf  ~ +4 dB @ 1.68 kHz  2) high-pass @ 38 Hz
 * Rendered offline so analysis is faster than realtime.
 */
const kWeight = async (buffer: AudioBuffer): Promise<Float32Array[]> => {
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const shelf = ctx.createBiquadFilter();
  shelf.type = 'highshelf';
  shelf.frequency.value = 1681.97;
  shelf.gain.value = 3.9998;

  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 38.135;
  hp.Q.value = 0.5003;

  src.connect(shelf);
  shelf.connect(hp);
  hp.connect(ctx.destination);
  src.start(0);

  const rendered = await ctx.startRendering();
  return Array.from({ length: rendered.numberOfChannels }, (_, i) => rendered.getChannelData(i));
};

/** Gated integrated loudness (400 ms blocks, 75% overlap, -70 LUFS abs gate, -10 LU rel gate). */
const integratedLufs = (channels: Float32Array[], sampleRate: number): number => {
  const hop = Math.round(sampleRate * 0.1);
  const length = channels[0].length;
  const segCount = Math.floor(length / hop);
  if (segCount < 4) return -Infinity;

  // Energy (sum over channels of mean-square) per 100 ms segment
  const seg = new Float64Array(segCount);
  for (let s = 0; s < segCount; s++) {
    let sum = 0;
    const start = s * hop;
    for (let c = 0; c < channels.length; c++) {
      const data = channels[c];
      let acc = 0;
      for (let i = start; i < start + hop; i++) acc += data[i] * data[i];
      sum += acc / hop;
    }
    seg[s] = sum;
  }

  const blocks: number[] = [];
  for (let s = 0; s + 4 <= segCount; s++) {
    blocks.push((seg[s] + seg[s + 1] + seg[s + 2] + seg[s + 3]) / 4);
  }

  const lufsOf = (e: number) => -0.691 + 10 * Math.log10(e);

  const absGated = blocks.filter((e) => e > 0 && lufsOf(e) > -70);
  if (absGated.length === 0) return -Infinity;

  const relThreshold = lufsOf(absGated.reduce((a, b) => a + b, 0) / absGated.length) - 10;
  const relGated = absGated.filter((e) => lufsOf(e) > relThreshold);
  if (relGated.length === 0) return -Infinity;

  return lufsOf(relGated.reduce((a, b) => a + b, 0) / relGated.length);
};

/** 4x oversampled peak using Catmull-Rom interpolation (close to true-peak behaviour). */
const truePeak = (data: Float32Array): number => {
  let peak = 0;
  const n = data.length;
  for (let i = 1; i < n - 2; i++) {
    const p0 = data[i - 1];
    const p1 = data[i];
    const p2 = data[i + 1];
    const p3 = data[i + 2];
    const a = Math.abs(p1);
    if (a > peak) peak = a;
    // Only worth interpolating near-peak regions
    if (a < peak * 0.5 && Math.abs(p2) < peak * 0.5) continue;
    for (let k = 1; k < 4; k++) {
      const t = k / 4;
      const v =
        0.5 *
        (2 * p1 +
          (-p0 + p2) * t +
          (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
          (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
      const av = Math.abs(v);
      if (av > peak) peak = av;
    }
  }
  return peak;
};

/**
 * Measure loudness/peak stats. `offset`/`length` allow ignoring limiter latency padding.
 */
export const measureLoudness = async (
  buffer: AudioBuffer,
  offset = 0,
  length = buffer.length - offset
): Promise<LoudnessStats> => {
  // Work on a trimmed copy only when needed
  let target = buffer;
  if (offset !== 0 || length !== buffer.length) {
    target = new AudioBuffer({
      numberOfChannels: buffer.numberOfChannels,
      length,
      sampleRate: buffer.sampleRate,
    });
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      target.copyToChannel(buffer.getChannelData(c).subarray(offset, offset + length), c);
    }
  }

  let samplePeak = 0;
  let tp = 0;
  for (let c = 0; c < target.numberOfChannels; c++) {
    const data = target.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      const a = Math.abs(data[i]);
      if (a > samplePeak) samplePeak = a;
    }
    tp = Math.max(tp, truePeak(data));
  }

  const weighted = await kWeight(target);
  const lufs = integratedLufs(weighted, target.sampleRate);
  const truePeakDb = toDb(Math.max(tp, samplePeak));

  return {
    lufs,
    samplePeakDb: toDb(samplePeak),
    truePeakDb,
    plr: Number.isFinite(lufs) ? truePeakDb - lufs : 0,
  };
};
