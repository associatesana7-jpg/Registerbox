/** Word-aware, offline IndicXlit candidates; all inference runs in a Web Worker. */
export type TypingModelProgress = { loaded: number; total: number; phase: 'downloading' | 'initializing' };
export const TYPING_MODEL_DOWNLOAD_BYTES = 48_476_309;
export const TYPING_MODEL_VERSION = 'indicxlit-v1-onnx-1.2.2';
// Model script is part of support: never silently use another language's model.
// Kashmiri and Sindhi use the model's Arabic-script variants. Sinhala is not
// offered by the page; regional languages are not aliased to another model.
export const TYPING_PREDICTION_LANGUAGES = ['as', 'bn', 'brx', 'gom', 'gu', 'hi', 'kn', 'ks', 'mai', 'ml', 'mni', 'mr', 'ne', 'or', 'pa', 'sa', 'sd', 'ta', 'te', 'ur'] as const;
export function supportsTypingPrediction(languageId: string): boolean {
  return (TYPING_PREDICTION_LANGUAGES as readonly string[]).includes(languageId);
}

type Pending = {
  resolve: (candidates: string[]) => void;
  reject: (error: Error) => void;
  progress?: (value: TypingModelProgress) => void;
  cleanup?: () => void;
};
let worker: Worker | undefined;
let nextId = 0;
let loaded = false;
let loadPromise: Promise<void> | undefined;
const pending = new Map<number, Pending>();

function getWorker(): Worker {
  if (worker) return worker;
  if (typeof Worker === 'undefined') throw new Error('This browser does not support the local typing model.');
  worker = new Worker(`/vendor/typing/typing-model-worker.js?v=${TYPING_MODEL_VERSION}`);
  worker.onmessage = event => {
    const { id, result, error, progress } = event.data ?? {};
    const request = pending.get(id);
    if (!request) return;
    if (progress) { request.progress?.(progress); return; }
    pending.delete(id);
    request.cleanup?.();
    if (typeof error === 'string') request.reject(new Error(error));
    else request.resolve(Array.isArray(result) ? result.filter((value): value is string => typeof value === 'string') : []);
  };
  worker.onerror = () => {
    for (const request of pending.values()) { request.cleanup?.(); request.reject(new Error('The local typing model stopped. Please load it again.')); }
    pending.clear();
    worker?.terminate();
    worker = undefined;
    loaded = false;
    loadPromise = undefined;
  };
  return worker;
}

function request(type: 'load' | 'predict', payload: { word?: string; language?: string; englishPronunciation?: boolean }, progress?: Pending['progress'], signal?: AbortSignal): Promise<string[]> {
  if (signal?.aborted) return Promise.reject(new DOMException('Cancelled', 'AbortError'));
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const target = getWorker();
    const abort = () => {
      pending.delete(id);
      target.postMessage({ type: 'cancel', id });
      reject(new DOMException('Cancelled', 'AbortError'));
    };
    signal?.addEventListener('abort', abort, { once: true });
    pending.set(id, { resolve, reject, progress, cleanup: () => signal?.removeEventListener('abort', abort) });
    target.postMessage({ type, id, ...payload });
  });
}

export async function loadTypingModel(onProgress?: (value: TypingModelProgress) => void): Promise<void> {
  if (loaded) return;
  if (!loadPromise) loadPromise = request('load', {}, onProgress).then(() => { loaded = true; }).catch(error => { loadPromise = undefined; throw error; });
  return loadPromise;
}

export async function predictTypingWord(word: string, languageId: string, options: { signal?: AbortSignal; englishPronunciation?: boolean } = {}): Promise<string[]> {
  if (!supportsTypingPrediction(languageId)) throw new Error('Word predictions are not available for this language.');
  const normalized = word.toLowerCase();
  if (!/^[a-z]{1,40}$/.test(normalized)) return [];
  // Explicit loading is required so the page cannot trigger a large download as
  // a side effect of typing, and text never becomes a remote service request.
  if (!loaded) throw new Error('Load word predictions before typing.');
  return request('predict', { word: normalized, language: languageId, englishPronunciation: options.englishPronunciation === true }, undefined, options.signal);
}
