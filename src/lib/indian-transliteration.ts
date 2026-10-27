import Sanscript from '../vendor/sanscript/sanscript.js';
import { getTypingLanguage, type TypingLanguage } from '../data/typing-languages.ts';

export { getTypingLanguage, TYPING_LANGUAGES } from '../data/typing-languages.ts';
export type { TypingLanguage } from '../data/typing-languages.ts';

export const MAX_TYPING_CHARACTERS = 20_000;
export type TransliterationOptions = { nativeDigits?: boolean; englishMode?: boolean };
export type RomanTypingWord = { word: string; start: number; end: number };
export type KeyboardKey = { roman: string; text: string };
export type TypingKeyboard = {
  vowels: KeyboardKey[];
  vowelMarks: KeyboardKey[];
  consonants: KeyboardKey[];
  signs: KeyboardKey[];
  digits: KeyboardKey[];
};

const SOUTHERN_SCRIPTS = new Set(['kannada', 'tamil', 'telugu', 'malayalam']);
const KEEP_ACRONYMS = new Set(['PDF', 'DOCX', 'XLSX', 'PPTX', 'TXT', 'CSV', 'GST', 'PAN', 'URL', 'HTML', 'HTTP', 'HTTPS', 'INR', 'UPI', 'OTP']);

// A small spelling aid, rather than a claim to predict every word in a language.
// Other words use the documented phonetic key mapping below.
const COMMON_WORDS: Record<string, Record<string, readonly string[]>> = {
  kn: {
    namaskara: ['ನಮಸ್ಕಾರ'], namaskaara: ['ನಮಸ್ಕಾರ'], namaste: ['ನಮಸ್ತೆ'], kannada: ['ಕನ್ನಡ'],
    karnataka: ['ಕರ್ನಾಟಕ'], bengaluru: ['ಬೆಂಗಳೂರು'], bangalore: ['ಬೆಂಗಳೂರು'],
    dhanyavada: ['ಧನ್ಯವಾದ'], dhanyavaada: ['ಧನ್ಯವಾದ'], bharata: ['ಭಾರತ'], bhaarata: ['ಭಾರತ'],
    nanna: ['ನನ್ನ'], hesaru: ['ಹೆಸರು'], neevu: ['ನೀವು'],
  },
  hi: {
    namaste: ['नमस्ते'], namaskar: ['नमस्कार'], namaskaar: ['नमस्कार'],
    dhanyavad: ['धन्यवाद'], dhanyavaad: ['धन्यवाद'], shukriya: ['शुक्रिया'],
    bharat: ['भारत'], bhaarat: ['भारत'], hindi: ['हिन्दी', 'हिंदी'],
    aap: ['आप'], kaise: ['कैसे'], hain: ['हैं'], hai: ['है'], main: ['मैं'], mein: ['में'],
    mera: ['मेरा'], naam: ['नाम'],
  },
  ta: { vanakkam: ['வணக்கம்'], tamil: ['தமிழ்'] },
  te: { namaste: ['నమస్తే'], namaskaram: ['నమస్కారం'], telugu: ['తెలుగు'] },
  ml: { namaste: ['നമസ്തേ'], namaskaram: ['നമസ്കാരം'], malayalam: ['മലയാളം'] },
  ks: { salaam: ['سلام'] },
  sd: { salaam: ['سلام'] },
  ur: { salaam: ['سلام'], salam: ['سلام'], shukriya: ['شکریہ'], urdu: ['اردو'], namaste: ['نمستے'] },
};

function checkLength(text: string): void {
  if (text.length > MAX_TYPING_CHARACTERS) {
    throw new Error(`Please keep each passage within ${MAX_TYPING_CHARACTERS.toLocaleString('en-IN')} characters.`);
  }
}

function sourceScheme(language: TypingLanguage): string {
  return SOUTHERN_SCRIPTS.has(language.script) ? 'itrans_dravidian' : 'itrans';
}

function stripUrduVowelMarks(text: string): string {
  // Sanscript's Urdu map is Sanskrit-oriented and contains an inherent fatha
  // on every consonant. Unvocalized output avoids contradictory vowel marks.
  return text.replace(/[\u064B-\u0652\u0670]/gu, '');
}

let olChikiTokens: readonly (readonly [string, string])[] | undefined;
function olChikiFromRoman(word: string, source: string): string {
  // Ol Chiki is an alphabet, not an abugida. Feeding it through Sanscript's
  // Brahmic path incorrectly retains inherent vowels before vowel letters.
  // Use its Roman phoneme parser, then map phonemes to independent letters.
  if (!olChikiTokens) {
    const from = Sanscript.schemes.iast;
    const to = Sanscript.schemes.ol_chiki;
    const tokens = new Map<string, string>();
    for (const group of ['vowels', 'consonants', 'extra_consonants', 'yogavaahas']) {
      for (const [key, roman] of Object.entries(from[group] ?? {})) {
        const target = to[group]?.[key];
        if (!roman || !target) continue;
        const value = group.includes('consonants') ? target.replace(/ᱚ$/u, '') : target;
        if (value) tokens.set(roman, value);
      }
    }
    olChikiTokens = [...tokens].sort((a, b) => b[0].length - a[0].length);
  }
  const roman = Sanscript.t(word, source, 'iast');
  let output = '';
  for (let position = 0; position < roman.length;) {
    const token = olChikiTokens.find(([sound]) => roman.startsWith(sound, position));
    if (token) {
      output += token[1];
      position += token[0].length;
    } else {
      const point = String.fromCodePoint(roman.codePointAt(position)!);
      output += point;
      position += point.length;
    }
  }
  return output;
}

function convertRomanWord(word: string, language: TypingLanguage, useDictionary: boolean): string {
  if (KEEP_ACRONYMS.has(word)) return word;
  const dictionary = COMMON_WORDS[language.id];
  const preferred = dictionary && Object.prototype.hasOwnProperty.call(dictionary, word.toLowerCase())
    ? dictionary[word.toLowerCase()] : undefined;
  if (useDictionary && preferred) return preferred[0];
  const source = sourceScheme(language);
  if (language.script === 'ol_chiki') return olChikiFromRoman(word, source);
  const result = Sanscript.t(word, source, language.script, {
    // Northern colloquial spellings commonly omit the final inherent 'a'.
    syncope: !SOUTHERN_SCRIPTS.has(language.script) && language.id !== 'sa',
    skip_sgml: true,
  });
  return language.script === 'urdu' ? stripUrduVowelMarks(result) : result;
}

function convertDigits(text: string, language: TypingLanguage): string {
  const symbols = Sanscript.schemes[language.script]?.symbols ?? {};
  return text.replace(/[0-9]/g, digit => symbols[String.fromCharCode(0x0966 + Number(digit))] || digit);
}

type TextRange = { start: number; end: number };
const EMAIL_LOCAL_CHARACTER = /^[A-Za-z0-9.!#$%&'*+/=?^_{|}~-]$/;
const DOMAIN_CHARACTER = /^[A-Za-z0-9.-]$/;
const COMPLETE_DOMAIN = /^[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

function protectedAddressRanges(text: string): TextRange[] {
  const ranges: TextRange[] = [];
  // Search only for fixed-length URL prefixes, then consume each URL once.
  // A broad unanchored email regex can rescan a long punctuation suffix at
  // every position. These scans inspect each address candidate just once.
  const urlPrefixes = /(?:https?:\/\/|ftp:\/\/|www\.)/gi;
  let url: RegExpExecArray | null;
  while ((url = urlPrefixes.exec(text))) {
    let end = url.index + url[0].length;
    while (end < text.length && !/[\s<>"']/u.test(text[end])) end++;
    ranges.push({ start: url.index, end });
    urlPrefixes.lastIndex = end;
  }
  for (let at = text.indexOf('@'); at !== -1; at = text.indexOf('@', at + 1)) {
    let start = at;
    let end = at + 1;
    while (start > 0 && EMAIL_LOCAL_CHARACTER.test(text[start - 1])) start--;
    while (end < text.length && DOMAIN_CHARACTER.test(text[end])) end++;
    // A sentence's final period is not part of its email address.
    const domain = text.slice(at + 1, end).replace(/\.+$/u, '');
    if (start < at && COMPLETE_DOMAIN.test(domain)) ranges.push({ start, end: at + 1 + domain.length });
  }
  const domainCandidates = /[A-Za-z0-9.-]+/g;
  let domain: RegExpExecArray | null;
  while ((domain = domainCandidates.exec(text))) {
    const candidate = domain[0].replace(/\.+$/u, '');
    if (!candidate.includes('.') || !COMPLETE_DOMAIN.test(candidate)) continue;
    let end = domain.index + candidate.length;
    // Bare addresses such as registerbox.in/tools may include a port and path.
    const suffix = /^:[0-9]{1,5}(?=\/|\s|$)/.exec(text.slice(end));
    if (suffix) end += suffix[0].length;
    if (text[end] === '/') {
      while (end < text.length && !/[\s<>"']/u.test(text[end])) end++;
    }
    ranges.push({ start: domain.index, end });
    domainCandidates.lastIndex = end;
  }
  ranges.sort((a, b) => a.start - b.start);
  const merged: TextRange[] = [];
  for (const range of ranges) {
    const previous = merged[merged.length - 1];
    if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end);
    else merged.push({ ...range });
  }
  return merged;
}

/** Roman words eligible for prediction, excluding addresses and fixed acronyms. */
export function getRomanTypingWords(text: string): RomanTypingWord[] {
  checkLength(text);
  const protectedRanges = protectedAddressRanges(text);
  const words: RomanTypingWord[] = [];
  let rangeIndex = 0;
  for (const match of text.matchAll(/~?[A-Za-z]+(?:\^[A-Za-z]+)?/g)) {
    const start = match.index;
    const end = start + match[0].length;
    while (protectedRanges[rangeIndex] && protectedRanges[rangeIndex].end <= start) rangeIndex++;
    const range = protectedRanges[rangeIndex];
    if (range && range.start < end) continue;
    if (!KEEP_ACRONYMS.has(match[0])) words.push({ word: match[0], start, end });
  }
  return words;
}

/** Converts a Roman word using local phonetic rules; no network or HTML parser. */
export function transliterateWord(word: string, languageId: string, options: TransliterationOptions = {}): string {
  return transliterateText(word, languageId, options);
}

/**
 * Convert only Roman typing spans. Existing native text, punctuation, line
 * breaks, web addresses and email addresses remain ordinary, unchanged text.
 */
export function transliterateText(text: string, languageId: string, options: TransliterationOptions = {}, wordConverter?: (word: string, start: number) => string): string {
  checkLength(text);
  if (options.englishMode || !text) return text;
  const language = getTypingLanguage(languageId);
  const convert = (passage: string, base: number) => passage.replace(/~?[A-Za-z]+(?:\^[A-Za-z]+)?|[0-9]+/g, (span, offset: number) => {
    if (/^[0-9]+$/.test(span)) return options.nativeDigits ? convertDigits(span, language) : span;
    return KEEP_ACRONYMS.has(span) ? span : wordConverter ? wordConverter(span, base + offset) : convertRomanWord(span, language, true);
  });
  let output = '';
  let position = 0;
  for (const range of protectedAddressRanges(text)) {
    output += convert(text.slice(position, range.start), position) + text.slice(range.start, range.end);
    position = range.end;
  }
  return output + convert(text.slice(position), position);
}

/** Local spelling alternatives. They are choices to review, not AI predictions. */
export function getWordSuggestions(word: string, languageId: string): string[] {
  if (!/^[A-Za-z~^]{1,80}$/.test(word) || KEEP_ACRONYMS.has(word)) return [];
  const language = getTypingLanguage(languageId);
  const dictionary = COMMON_WORDS[language.id];
  const saved = dictionary && Object.prototype.hasOwnProperty.call(dictionary, word.toLowerCase())
    ? dictionary[word.toLowerCase()] : [];
  const result = new Set(saved);
  result.add(convertRomanWord(word, language, false));
  // Offer bounded variations for common short/long vowel and consonant
  // ambiguities. Preserve uppercase ITRANS distinctions in the user's input.
  const variants = [
    word.replace(/a(?!a)/, 'aa'), word.replace(/i(?!i)/, 'ii'), word.replace(/u(?!u)/, 'uu'),
    word.replace(/aa/, 'a'), word.replace(/ee/, 'i'), word.replace(/oo/, 'u'),
    word.replace(/sh/, 'Sh'), word.replace(/n/, 'N'), word.replace(/t/, 'T'),
    ...(SOUTHERN_SCRIPTS.has(language.script) ? [word.replace(/e/, 'E'), word.replace(/o/, 'O')] : []),
  ];
  for (const variant of variants) {
    if (variant !== word) result.add(convertRomanWord(variant, language, false));
    if (result.size >= 6) break;
  }
  return [...result].filter(value => value && value !== word).slice(0, 6);
}

/** Native character buttons and the Roman keys that produce their sounds. */
export function getKeyboard(languageId: string): TypingKeyboard {
  const language = getTypingLanguage(languageId);
  const target = Sanscript.schemes[language.script];
  const source = Sanscript.schemes[sourceScheme(language)];
  const seen = new Set<string>();
  const makeKeys = (groups: string[], consonants = false): KeyboardKey[] => {
    const keys: KeyboardKey[] = [];
    for (const group of groups) {
      for (const [key, raw] of Object.entries(target[group] ?? {})) {
        let text = language.script === 'urdu' ? stripUrduVowelMarks(raw) : raw;
        if (language.script === 'ol_chiki' && consonants) text = text.replace(/ᱚ$/u, '');
        if (!text || seen.has(text)) continue;
        seen.add(text);
        const hint = source[group]?.[key] ?? '';
        keys.push({ text, roman: consonants && hint ? `${hint}a` : hint });
      }
    }
    return keys;
  };
  const vowels = makeKeys(['vowels']);
  const vowelMarks = makeKeys(['vowel_marks']);
  const consonants = makeKeys(['consonants', 'extra_consonants'], true);
  const signs = makeKeys(['yogavaahas', 'virama', 'candra']);
  const arabicExtras = language.id === 'sd' ? 'ٻڀٿٽٺڄڇڌڏڊڍڙڦڻڱڳڪگ' : language.id === 'ks' ? 'ٹڈڑژٲۆۄۈؠ' : '';
  for (const text of arabicExtras) {
    if (!seen.has(text)) { consonants.push({ text, roman: '' }); seen.add(text); }
  }
  // Modern Malayalam chillu letters are explicit Unicode letters, not the
  // older consonant + virama + joiner sequences.
  if (language.script === 'malayalam') {
    for (const text of ['ൺ', 'ൻ', 'ർ', 'ൽ', 'ൾ', 'ൿ']) signs.push({ text, roman: '' });
  }
  const digits = Array.from({ length: 10 }, (_, index) => ({ roman: String(index), text: convertDigits(String(index), language) }));
  return { vowels, vowelMarks, consonants, signs, digits };
}

export function countTypingText(text: string): { words: number; characters: number } {
  const words = text.trim() ? text.trim().split(/\s+/u).length : 0;
  // Count Unicode code points rather than splitting surrogate-pair letters.
  return { words, characters: Array.from(text).length };
}
