import { DEFAULT_OUTPUT, LoudnessStats, MasteringParams, OutputParams } from '../types';
import { getApiKey } from './apiKey';

export type AiErrorCode = 'NO_API_KEY' | 'INVALID_KEY' | 'RATE_LIMIT' | 'NETWORK' | 'BAD_RESPONSE' | 'FAILED';

export class AiError extends Error {
  constructor(public code: AiErrorCode, message?: string) {
    super(message ?? code);
  }
}

const MODEL = 'gemini-3-flash-preview';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM_INSTRUCTION = `You are a world-class Audio Mastering Engineer.
Translate the user's subjective description of a sound (e.g. "warm and punchy", "clear and wide", "lo-fi radio")
into specific mastering parameters. If track analysis is provided, use it: avoid adding more loudness to an already
loud/compressed track, add more compression/glue to very dynamic ones, and set a sensible target loudness.

Ranges:
- EQ gains: -12 to +12 dB (low shelf 100Hz, mid peak 1kHz, high shelf 10kHz)
- Compressor threshold -60..0 dB, ratio 1..20, attack 0.001..0.1 s, release 0.01..1.0 s, knee 0..40 dB, makeup 0..12 dB
- Stereo width 0..2 (1.0 = unchanged)
- Low cut (high-pass) 0..200 Hz (0 = off; 20-40 is typical for cleaning sub rumble)
- Target loudness: streaming ~ -14 LUFS, loud/club ~ -9 LUFS, dynamic/audiophile ~ -16 LUFS
- Ceiling: -1.0 dBTP is the safe default (-0.3 to -2)

Hints: "Punchy" = slower attack (10-30ms), higher ratio (4-8), bass boost. "Warm" = low-mid presence, gentle high shelf cut.
"Airy/Bright" = high shelf boost. "Glue" = gentle compression (2:1, low threshold).`;

const num = (description: string) => ({ type: 'NUMBER', description });

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    eq: {
      type: 'OBJECT',
      properties: { lowGain: num('dB'), midGain: num('dB'), highGain: num('dB') },
      required: ['lowGain', 'midGain', 'highGain'],
    },
    compressor: {
      type: 'OBJECT',
      properties: {
        threshold: num('dB'),
        ratio: num('ratio'),
        attack: num('seconds'),
        release: num('seconds'),
        knee: num('dB'),
        makeup: num('dB'),
      },
      required: ['threshold', 'ratio', 'attack', 'release'],
    },
    stereoWidth: num('0..2'),
    lowCut: num('Hz'),
    targetLufs: num('Target integrated loudness in LUFS'),
    ceiling: num('Limiter ceiling in dBTP'),
  },
  required: ['eq', 'compressor', 'stereoWidth'],
};

// Never trust model output: clamp everything to the engine's valid ranges.
const clamp = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  return Math.min(max, Math.max(min, n));
};

/**
 * Calls Gemini directly from the browser with the user's own API key.
 * The key goes only to generativelanguage.googleapis.com (in a header, never in the URL).
 */
export const generateMasteringParams = async (
  description: string,
  current: MasteringParams,
  analysis?: LoudnessStats | null
): Promise<MasteringParams> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new AiError('NO_API_KEY');

  const analysisText =
    analysis && Number.isFinite(analysis.lufs)
      ? `\nTrack analysis: integrated loudness ${analysis.lufs.toFixed(1)} LUFS, true peak ${analysis.truePeakDb.toFixed(1)} dBTP, PLR ${analysis.plr.toFixed(1)} dB.`
      : '';

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [
          {
            role: 'user',
            parts: [{ text: `Generate audio mastering parameters for: "${description.slice(0, 500)}"${analysisText}` }],
          },
        ],
        generationConfig: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA },
      }),
    });
  } catch {
    throw new AiError('NETWORK');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const msg = String(body?.error?.message ?? '');
    if (response.status === 401 || response.status === 403 || (response.status === 400 && /api key/i.test(msg))) {
      throw new AiError('INVALID_KEY', msg);
    }
    if (response.status === 429) throw new AiError('RATE_LIMIT', msg);
    throw new AiError('FAILED', msg || `HTTP ${response.status}`);
  }

  let raw: any;
  try {
    const data = await response.json();
    raw = JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
  } catch {
    throw new AiError('BAD_RESPONSE');
  }

  const prevOut: OutputParams = current.output ?? DEFAULT_OUTPUT;
  return {
    eq: {
      lowGain: clamp(raw.eq?.lowGain, -12, 12, 0),
      midGain: clamp(raw.eq?.midGain, -12, 12, 0),
      highGain: clamp(raw.eq?.highGain, -12, 12, 0),
    },
    compressor: {
      threshold: clamp(raw.compressor?.threshold, -60, 0, -18),
      ratio: clamp(raw.compressor?.ratio, 1, 20, 4),
      attack: clamp(raw.compressor?.attack, 0.001, 0.1, 0.01),
      release: clamp(raw.compressor?.release, 0.01, 1, 0.2),
      knee: clamp(raw.compressor?.knee, 0, 40, 30),
      makeup: clamp(raw.compressor?.makeup, 0, 12, 0),
    },
    stereoWidth: clamp(raw.stereoWidth, 0, 2, 1),
    lowCut: clamp(raw.lowCut, 0, 200, 0),
    output: {
      ...prevOut,
      ceiling: clamp(raw.ceiling, -6, 0, -1),
      targetLufs: typeof raw.targetLufs === 'number' ? clamp(raw.targetLufs, -24, -6, -14) : prevOut.targetLufs,
    },
  };
};
