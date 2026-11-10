// BYOK: the user's own Gemini API key lives only in this browser.
// It is never sent anywhere except directly to Google's API (see aiMastering.ts).

const STORAGE_KEY = 'mastering.geminiApiKey';

// In-memory fallback for when web storage is blocked (private mode, etc.)
let memoryKey: string | null = null;

const safe = <T>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export const getApiKey = (): string | null =>
  memoryKey ??
  safe(() => window.localStorage.getItem(STORAGE_KEY), null) ??
  safe(() => window.sessionStorage.getItem(STORAGE_KEY), null);

/** remember = true -> localStorage (persists), false -> sessionStorage (until the tab closes) */
export const saveApiKey = (key: string, remember: boolean): void => {
  const trimmed = key.trim();
  clearApiKey();
  memoryKey = trimmed;
  const ok = safe(() => {
    (remember ? window.localStorage : window.sessionStorage).setItem(STORAGE_KEY, trimmed);
    return true;
  }, false);
  if (ok) memoryKey = null; // storage works, no need for the memory copy
};

export const clearApiKey = (): void => {
  memoryKey = null;
  safe(() => window.localStorage.removeItem(STORAGE_KEY), undefined);
  safe(() => window.sessionStorage.removeItem(STORAGE_KEY), undefined);
};

export const isKeyRemembered = (): boolean =>
  safe(() => window.localStorage.getItem(STORAGE_KEY) !== null, false);

export const maskKey = (key: string): string =>
  key.length <= 8 ? '••••' : `${key.slice(0, 4)}••••${key.slice(-4)}`;
