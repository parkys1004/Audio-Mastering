// Input formats are decoded by the browser (decodeAudioData). Output is always WAV.

export const SUPPORTED_EXTENSIONS = ['wav', 'mp3', 'flac', 'ogg', 'oga', 'opus', 'm4a', 'aac', 'mp4', 'webm', 'weba'];

export const ACCEPT_ATTRIBUTE = `audio/*,${SUPPORTED_EXTENSIONS.map((e) => `.${e}`).join(',')}`;

export const getExtension = (name: string): string => {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
};

export const isSupportedAudio = (file: File): boolean =>
  SUPPORTED_EXTENSIONS.includes(getExtension(file.name)) || file.type.startsWith('audio/');

/** "song.mp3" -> "mastered_song.wav" */
export const masteredName = (name: string): string => {
  const i = name.lastIndexOf('.');
  const base = i > 0 ? name.slice(0, i) : name;
  return `mastered_${base}.wav`;
};

export const formatLabel = (file: File): string => {
  const ext = getExtension(file.name);
  return ext ? ext.toUpperCase() : 'AUDIO';
};

// ---------------------------------------------------------------------------
// Sample-rate detection, so the file is processed at its own rate (no resampling).
// Falls back to 44.1 kHz when the container can't be parsed.
// ---------------------------------------------------------------------------
const FALLBACK_RATE = 44100;

const ascii = (b: Uint8Array, off: number, len: number) =>
  String.fromCharCode(...Array.from(b.subarray(off, off + len)));

const MP3_RATES: Record<number, number[]> = {
  3: [44100, 48000, 32000], // MPEG 1
  2: [22050, 24000, 16000], // MPEG 2
  0: [11025, 12000, 8000], // MPEG 2.5
};

const mp3Rate = (b: Uint8Array): number | null => {
  let pos = 0;
  if (ascii(b, 0, 3) === 'ID3' && b.length > 10) {
    const size = ((b[6] & 0x7f) << 21) | ((b[7] & 0x7f) << 14) | ((b[8] & 0x7f) << 7) | (b[9] & 0x7f);
    pos = 10 + size + ((b[5] & 0x10) !== 0 ? 10 : 0);
  }
  const limit = Math.min(b.length - 4, pos + 65536);
  for (let i = pos; i < limit; i++) {
    if (b[i] === 0xff && (b[i + 1] & 0xe0) === 0xe0) {
      const version = (b[i + 1] >> 3) & 3;
      const layer = (b[i + 1] >> 1) & 3;
      const idx = (b[i + 2] >> 2) & 3;
      if (version !== 1 && layer !== 0 && idx !== 3 && MP3_RATES[version]) {
        return MP3_RATES[version][idx];
      }
    }
  }
  return null;
};

const mp4Rate = (b: Uint8Array): number | null => {
  // find 'mp4a' sample entry; 16.16 sample rate sits 28 bytes after the tag
  for (let i = 0; i < b.length - 32; i++) {
    if (b[i] === 0x6d && b[i + 1] === 0x70 && b[i + 2] === 0x34 && b[i + 3] === 0x61) {
      return (b[i + 28] << 8) | b[i + 29];
    }
  }
  return null;
};

const oggRate = (b: Uint8Array): number | null => {
  const head = b.subarray(0, Math.min(b.length, 512));
  const text = ascii(head, 0, head.length);
  if (text.includes('OpusHead')) return 48000;
  const v = text.indexOf('\x01vorbis');
  if (v >= 0 && v + 15 <= head.length) {
    const o = v + 12; // 1 type + 6 'vorbis' + 4 version + 1 channels
    return head[o] | (head[o + 1] << 8) | (head[o + 2] << 16) | (head[o + 3] << 24);
  }
  return null;
};

export const detectSampleRate = (arrayBuffer: ArrayBuffer): number => {
  try {
    const b = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    let rate: number | null = null;

    if (ascii(b, 0, 4) === 'RIFF' || ascii(b, 0, 4) === 'RF64') {
      rate = view.getUint32(24, true);
    } else if (ascii(b, 0, 4) === 'fLaC') {
      rate = (b[18] << 12) | (b[19] << 4) | (b[20] >> 4);
    } else if (ascii(b, 0, 4) === 'OggS') {
      rate = oggRate(b);
    } else if (ascii(b, 4, 4) === 'ftyp') {
      rate = mp4Rate(b);
    } else if (ascii(b, 0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) {
      rate = mp3Rate(b);
    }

    if (rate && rate >= 8000 && rate <= 192000) return rate;
  } catch {
    /* fall through */
  }
  return FALLBACK_RATE;
};
