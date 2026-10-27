import { getRomanTypingWords, MAX_TYPING_CHARACTERS, transliterateText, type TransliterationOptions } from './indian-transliteration.ts';

export type TypingInputStyle = 'auto' | 'indian' | 'english';
const ENGLISH_MARKERS = new Set(['hey', 'hello', 'my', 'your', 'our', 'their', 'name', 'is', 'are', 'am', 'was', 'were', 'the', 'and', 'with', 'please', 'this', 'that', 'have', 'has', 'from']);
/** Conservative convenience heuristic; the visible input-style control can override it. */
export function usesEnglishPronunciation(source: string, style: TypingInputStyle): boolean {
  if (style !== 'auto') return style === 'english';
  const markers = new Set(getRomanTypingWords(source).map(item => item.word.toLowerCase()).filter(word => ENGLISH_MARKERS.has(word)));
  return markers.size >= 2 || /^(?:hi|hello|hey)[!?.\s]*$/i.test(source.trim());
}
export type TypingWordChoice = { start: number; end: number; roman: string; value: string; languageId: string };
/** Retain choices through unrelated edits, invalidating only a changed word. */
export function updateTypingChoices(previous: string, source: string, choices: readonly TypingWordChoice[] = []): TypingWordChoice[] {
  let start = 0;
  while (start < previous.length && start < source.length && previous[start] === source[start]) start++;
  let oldEnd = previous.length;
  let newEnd = source.length;
  while (oldEnd > start && newEnd > start && previous[oldEnd - 1] === source[newEnd - 1]) { oldEnd--; newEnd--; }
  const delta = newEnd - oldEnd;
  const spans = getRomanTypingWords(source);
  return choices.flatMap(choice => {
    const moved = choice.end <= start ? choice : choice.start >= oldEnd ? { ...choice, start: choice.start + delta, end: choice.end + delta } : null;
    return moved && spans.some(span => span.start === moved.start && span.end === moved.end && span.word === moved.roman) ? [moved] : [];
  });
}
export type WordPredictor = (word: string, languageId: string, options: { signal?: AbortSignal; englishPronunciation?: boolean }) => Promise<string[]>;
export type PredictiveTypingOptions = TransliterationOptions & {
  signal?: AbortSignal;
  finishLastWord?: boolean;
  englishPronunciation?: boolean;
  choices?: readonly TypingWordChoice[];
  onProgress?: (completed: number, total: number) => void;
};

/** A bounded, in-memory cache. Typed passages are never persisted. */
export function createPredictiveTyping(predict: WordPredictor) {
  const cache = new Map<string, string[]>();
  const key = (word: string, languageId: string, english = false) => `${languageId}:${english ? 'english' : 'indian'}:${word.toLowerCase()}`;
  const peek = (word: string, languageId: string, english = false) => cache.get(key(word, languageId, english));
  const checkAbort = (signal?: AbortSignal) => {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  };
  const checkSource = (source: string) => {
    if (source.length > MAX_TYPING_CHARACTERS) throw new Error('Please keep each passage within 20,000 characters.');
  };
  async function candidates(word: string, languageId: string, signal?: AbortSignal, englishPronunciation = false) {
    checkAbort(signal);
    const saved = peek(word, languageId, englishPronunciation);
    if (saved) return saved;
    // Preserve unsupported runs literally; do not disguise rule output as a prediction.
    if (!/^[A-Za-z]{1,40}$/.test(word)) return [];
    const result = await predict(word, languageId, { signal, englishPronunciation });
    checkAbort(signal);
    const values = [...new Set(result.filter(value => typeof value === 'string' && value.length > 0 && value.length <= 160))].slice(0, 5);
    cache.set(key(word, languageId, englishPronunciation), values);
    if (cache.size > 600) cache.delete(cache.keys().next().value!);
    return values;
  }
  function preview(source: string, languageId: string, options: PredictiveTypingOptions = {}) {
    checkSource(source);
    const chosen = (options.choices ?? []).filter(choice => choice.languageId === languageId && source.slice(choice.start, choice.end) === choice.roman);
    const trailing = options.finishLastWord === false ? /[A-Za-z~^]+$/.exec(source) : null;
    const unfinished = trailing && !chosen.some(choice => choice.start === trailing.index && choice.end === source.length) ? trailing : null;
    const prefix = unfinished ? source.slice(0, unfinished.index) : source;
    return transliterateText(prefix, languageId, options, (word, start) => chosen.find(choice => choice.start === start && choice.end === start + word.length)?.value ?? peek(word, languageId, options.englishPronunciation)?.[0] ?? word) + (unfinished?.[0] ?? '');
  }
  async function convert(source: string, languageId: string, options: PredictiveTypingOptions = {}) {
    checkSource(source);
    checkAbort(options.signal);
    if (options.englishMode) return source;
    const unfinished = options.finishLastWord === false ? /[A-Za-z~^]+$/.exec(source) : null;
    const words = [...new Set(getRomanTypingWords(source).filter(item => !unfinished || item.start < unfinished.index).map(item => item.word.toLowerCase()))];
    for (let index = 0; index < words.length; index++) {
      checkAbort(options.signal);
      await candidates(words[index], languageId, options.signal, options.englishPronunciation);
      options.onProgress?.(index + 1, words.length);
    }
    checkAbort(options.signal);
    return preview(source, languageId, options);
  }
  return { candidates, convert, preview, peek };
}
