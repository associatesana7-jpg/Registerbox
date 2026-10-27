/* Browser-only IndicXlit inference. Model © AI4Bharat; ONNX conversion © cloudrumbles.
 * MIT licenses and pinned model provenance are served beside this worker.
 * Only static model/runtime assets are fetched; typed words never leave this worker.
 */
/* global importScripts, ort */
'use strict';
const ASSETS = '/vendor/typing/';
const MODEL_BYTES = 48_476_309;
const LANGUAGES = new Set(['as', 'bn', 'brx', 'gom', 'gu', 'hi', 'kn', 'ks', 'mai', 'ml', 'mni', 'mr', 'ne', 'or', 'pa', 'sa', 'sd', 'si', 'ta', 'te', 'ur']);
let enginePromise;
let queue = Promise.resolve();
const cancelled = new Set();
const knownRequests = new Set();
const cache = new Map();
const dictionaries = new Map();
const rawCache = new Map();
let pronunciationsPromise;
let phonemeFeaturesPromise;

// Corrections verified against the reference typing flow with the same Roman
// spelling. Keep this list small and reviewable: it only changes the preferred
// candidate, while the model's other suggestions remain available.
const VERIFIED_NATIVE_PREFERENCES = new Map([
  ['kn:tumba', 'ತುಂಬಾ'],
  ['kn:vyavasaayada', 'ವ್ಯವಸಾಯದ'],
  ['kn:maatadona', 'ಮಾತಾಡೋಣ'],
]);

async function loadCompressedDictionary(path) {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot load the local word dictionaries. Please use a current browser.');
  const response = await fetch(path, { credentials: 'same-origin', signal: AbortSignal.timeout(60_000) });
  if (!response.ok || !response.body) throw new Error('The word dictionary could not be loaded. Please try again.');
  // Some hosts send Content-Encoding:gzip for .gz resources and the browser
  // already decompresses them. Inspect bytes before applying decompression.
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > 8_000_000) throw new Error('Unexpected word dictionary size.');
  const stream = new Blob([bytes]).stream();
  const reader = (bytes[0] === 0x1f && bytes[1] === 0x8b ? stream.pipeThrough(new DecompressionStream('gzip')) : stream).getReader();
  const decoder = new TextDecoder();
  let text = '';
  let total = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > 8_000_000) { await reader.cancel(); throw new Error('Unexpected word dictionary size.'); }
    text += decoder.decode(value, { stream: true });
  }
  return JSON.parse(text + decoder.decode());
}

function getPhonemeFeatures() {
  if (!phonemeFeaturesPromise) phonemeFeaturesPromise = loadCompressedDictionary('/vendor/typing-lexicons/english-phoneme-features.json.gz').catch(error => { phonemeFeaturesPromise = undefined; throw error; });
  return phonemeFeaturesPromise;
}

function pronunciationFidelity(word, language, features) {
  const deva = ['hi', 'mr', 'ne', 'sa', 'gom', 'mai', 'brx'].includes(language);
  const stops = deva ? ['त', 'ट', 'द', 'ड'] : ({
    kn: ['ತ', 'ಟ', 'ದ', 'ಡ'], te: ['త', 'ట', 'ద', 'డ'],
    ta: ['த', 'ட', 'த', 'ட'], ml: ['ത', 'ട', 'ദ', 'ഡ'],
    as: ['ত', 'ট', 'দ', 'ড'], bn: ['ত', 'ট', 'দ', 'ড'],
    gu: ['ત', 'ટ', 'દ', 'ડ'], pa: ['ਤ', 'ਟ', 'ਦ', 'ਡ'],
    or: ['ତ', 'ଟ', 'ଦ', 'ଡ'], ur: ['ت', 'ٹ', 'د', 'ڈ'],
    ks: ['ت', 'ٹ', 'د', 'ڈ'], sd: ['ت', 'ٽ', 'د', 'ڊ'],
  })[language];
  let score = 0;
  if (stops && (features & 1)) score += Number(word.includes(stops[1])) - Number(word.includes(stops[0]));
  if (stops && (features & 2)) score += Number(word.includes(stops[3])) - Number(word.includes(stops[2]));
  // English /z/ has an explicit nukta spelling in Devanagari; keep both options
  // but rank the phoneme-faithful form before a plain /j/ spelling.
  if (deva && (features & 4)) score += Number(word.includes('ज़'));
  return score;
}

function frequency(dictionary, word) {
  const value = Object.hasOwn(dictionary, word) ? dictionary[word] : 0;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function getPronunciations() {
  if (!pronunciationsPromise) pronunciationsPromise = loadCompressedDictionary('/vendor/typing-lexicons/english-pronunciations.json.gz').catch(error => { pronunciationsPromise = undefined; throw error; });
  return pronunciationsPromise;
}

async function getDictionary(language) {
  if (!dictionaries.has(language)) dictionaries.set(language, loadCompressedDictionary(`/vendor/typing-lexicons/${language}.json.gz`).then(dictionary => {
    // Retain two recent priors so language switching stays bounded on phones.
    while (dictionaries.size > 2) {
      const oldest = dictionaries.keys().next().value;
      if (oldest === language) break;
      dictionaries.delete(oldest);
    }
    return dictionary;
  }).catch(error => { dictionaries.delete(language); throw error; }));
  return dictionaries.get(language);
}

async function download(name, onBytes) {
  const response = await fetch(`${ASSETS}${name}`, { credentials: 'same-origin', signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error('The typing model could not be downloaded. Please try loading it again.');
  if (!response.body) {
    const buffer = await response.arrayBuffer();
    onBytes(buffer.byteLength);
    return buffer;
  }
  const reader = response.body.getReader();
  const parts = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 35_000_000) { await reader.cancel(); throw new Error('Unexpected typing model size.'); }
    onBytes(value.byteLength);
    parts.push(value);
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.byteLength; }
  return result.buffer;
}

function initialize(requestId) {
  if (enginePromise) return enginePromise;
  enginePromise = (async () => {
    importScripts(`${ASSETS}ort.wasm.min.js`);
    ort.env.wasm.wasmPaths = ASSETS;
    // Works without cross-origin isolation and keeps this page's main thread responsive.
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    let loaded = 0;
    const progress = increment => {
      loaded += increment;
      self.postMessage({ id: requestId, progress: { loaded, total: MODEL_BYTES, phase: 'downloading' } });
    };
    const [encoderData, decoderData, vocabularyData] = await Promise.all([
      download('indicxlit_encoder.onnx', progress),
      download('indicxlit_decoder_v2.onnx', progress),
      download('vocab.json', progress),
    ]);
    self.postMessage({ id: requestId, progress: { loaded, total: MODEL_BYTES, phase: 'initializing' } });
    const vocabulary = JSON.parse(new TextDecoder().decode(vocabularyData));
    const options = { executionProviders: ['wasm'], graphOptimizationLevel: 'all' };
    const encoder = await ort.InferenceSession.create(encoderData, options);
    const decoder = await ort.InferenceSession.create(decoderData, options);
    return { encoder, decoder, vocabulary, sourceTokens: new Map(vocabulary.src.map((token, index) => [token, index])) };
  })().catch(error => { enginePromise = undefined; throw error; });
  return enginePromise;
}

function normalizedScore(beam) {
  return beam.score / ((5 + Math.max(1, beam.tokens.length - 1)) / 6);
}

async function generateCandidates(engine, word, language, id) {
  const key = `${language}:${word}`;
  if (rawCache.has(key)) return rawCache.get(key);
  const { encoder, decoder, vocabulary, sourceTokens } = engine;
  const { eos, unk, bos, pad } = vocabulary.special_tokens;
  const tokenIds = [sourceTokens.get(`__${language}__`), ...Array.from(word, letter => sourceTokens.get(letter) ?? unk), eos];
  const input = new ort.Tensor('int64', BigInt64Array.from(tokenIds, BigInt), [1, tokenIds.length]);
  let encoded;
  try { encoded = await encoder.run({ src_tokens: input }); }
  finally { input.dispose(); }
  const encoderOut = encoded.encoder_out;
  let beams = [{ tokens: [eos], score: 0 }];
  const finished = [];
  const width = 10;
  const maxLength = Math.min(48, word.length * 2 + 8);
  try {
    for (let step = 0; step < maxLength && beams.length; step++) {
      if (cancelled.has(id)) throw new Error('Cancelled');
      const next = [];
      for (const beam of beams) {
        if (cancelled.has(id)) throw new Error('Cancelled');
        const previous = new ort.Tensor('int64', BigInt64Array.from(beam.tokens, BigInt), [1, beam.tokens.length]);
        let result;
        try { result = await decoder.run({ prev_tokens: previous, encoder_out: encoderOut }); }
        finally { previous.dispose(); }
        const output = result.decoder_out;
        const logits = output.data;
        const vocabSize = vocabulary.tgt.length;
        const offset = (beam.tokens.length - 1) * vocabSize;
        let maximum = -Infinity;
        for (let index = 0; index < vocabSize; index++) if (index !== bos && index !== pad && index !== unk && !(step === 0 && index === eos)) maximum = Math.max(maximum, logits[offset + index]);
        let sum = 0;
        for (let index = 0; index < vocabSize; index++) if (index !== bos && index !== pad && index !== unk && !(step === 0 && index === eos)) sum += Math.exp(logits[offset + index] - maximum);
        const normalizer = maximum + Math.log(sum);
        const ranked = [];
        for (let index = 0; index < vocabSize; index++) {
          if (index === bos || index === pad || index === unk || (step === 0 && index === eos) || vocabulary.tgt[index].startsWith('__') || vocabulary.tgt[index].startsWith('madeupword')) continue;
          ranked.push({ token: index, score: logits[offset + index] - normalizer });
        }
        ranked.sort((a, b) => b.score - a.score);
        for (const item of ranked.slice(0, width * 2)) {
          const candidate = { tokens: [...beam.tokens, item.token], score: beam.score + item.score };
          if (item.token === eos) finished.push(candidate);
          else next.push(candidate);
        }
        output.dispose();
      }
      next.sort((a, b) => b.score - a.score);
      beams = next.slice(0, width);
      // A finished candidate's normalized score cannot improve; unfinished paths
      // are bounded using the maximum permitted output length before stopping.
      if (finished.length >= width) {
        finished.sort((a, b) => normalizedScore(b) - normalizedScore(a));
        const worstWinner = normalizedScore(finished[width - 1]);
        const bestPossibleUnfinished = (beams[0]?.score ?? -Infinity) / ((5 + maxLength) / 6);
        if (bestPossibleUnfinished < worstWinner) break;
      }
    }
    const ranked = [...finished, ...beams].sort((a, b) => normalizedScore(b) - normalizedScore(a));
    const seen = new Set();
    const unique = ranked.map(beam => ({ word: beam.tokens.slice(1).filter(token => token !== eos && token !== bos && token !== pad && token !== unk).map(token => vocabulary.tgt[token]).join('').normalize('NFC'), modelScore: normalizedScore(beam) })).filter(candidate => {
      if (!candidate.word || seen.has(candidate.word)) return false;
      seen.add(candidate.word);
      return true;
    }).slice(0, 30);
    rawCache.set(key, unique);
    if (rawCache.size > 600) rawCache.delete(rawCache.keys().next().value);
    return unique;
  } finally {
    encoderOut.dispose();
  }
}

async function inferWord(engine, word, language, id, englishPronunciation = false) {
  const key = `${language}:${word}:${englishPronunciation ? 'english' : 'indian'}`;
  if (cache.has(key)) return cache.get(key);
  const dictionary = engine.dictionary ?? await getDictionary(language);
  const original = await generateCandidates(engine, word, language, id);
  const merged = new Map(original.map(candidate => [candidate.word, { ...candidate, englishCandidate: false }]));
  // Roman Indian words and English words share spellings. The English channel
  // adds pronunciation-based neural inputs for every dictionary match. The
  // caller can prefer that channel when the writer chose English sounds.
  {
    const pronunciations = engine.pronunciations ?? await getPronunciations();
    const aliases = Object.hasOwn(pronunciations, word) && Array.isArray(pronunciations[word]) ? pronunciations[word].filter(alias => typeof alias === 'string' && /^[a-z]{1,40}$/.test(alias) && alias !== word).slice(0, 2) : [];
    for (const alias of aliases) {
      if (cancelled.has(id)) throw new Error('Cancelled');
      const variants = await generateCandidates(engine, alias, language, id);
      for (const candidate of variants) {
        // A slight prior favors the actual letters when scores are similar.
        const adjusted = { ...candidate, modelScore: candidate.modelScore - 0.15, englishCandidate: true };
        const existing = merged.get(candidate.word);
        if (!existing || existing.modelScore < adjusted.modelScore) merged.set(candidate.word, adjusted);
        else existing.englishCandidate = true;
      }
    }
  }
  const unique = [...merged.values()];
  const featureDictionary = englishPronunciation ? (engine.phonemeFeatures ?? await getPhonemeFeatures()) : {};
  const features = Object.hasOwn(featureDictionary, word) && Number.isSafeInteger(featureDictionary[word]) ? featureDictionary[word] : 0;
  for (const candidate of unique) candidate.fidelity = pronunciationFidelity(candidate.word, language, features);
  const totalModelProbability = unique.reduce((sum, candidate) => sum + Math.exp(candidate.modelScore), 0);
  const totalDictionaryProbability = unique.reduce((sum, candidate) => sum + frequency(dictionary, candidate.word), 0);
  // Combine neural likelihood with a genuine native-word frequency prior.
  // Unknown alternatives remain available after ranked dictionary candidates.
  if (totalDictionaryProbability > 0) {
    for (const candidate of unique) candidate.rankScore = frequency(dictionary, candidate.word) ? 0.9 * Math.exp(candidate.modelScore) / totalModelProbability + 0.1 * frequency(dictionary, candidate.word) / totalDictionaryProbability : 0;
    unique.sort((a, b) => (englishPronunciation ? Number(b.englishCandidate) - Number(a.englishCandidate) || b.fidelity - a.fidelity : 0) || b.rankScore - a.rankScore || b.modelScore - a.modelScore);
  } else unique.sort((a, b) => (englishPronunciation ? Number(b.englishCandidate) - Number(a.englishCandidate) || b.fidelity - a.fidelity : 0) || b.modelScore - a.modelScore);
  const rankedWords = unique.map(candidate => candidate.word);
  const preferred = englishPronunciation ? undefined : VERIFIED_NATIVE_PREFERENCES.get(`${language}:${word}`);
  const candidates = (preferred ? [preferred, ...rankedWords.filter(candidate => candidate !== preferred)] : rankedWords).slice(0, 5);
  cache.set(key, candidates);
  if (cache.size > 600) cache.delete(cache.keys().next().value);
  return candidates;
}

self.onmessage = event => {
  const { type, id, word, language, englishPronunciation } = event.data ?? {};
  if (type === 'cancel') {
    // Late cancels for completed requests cannot accumulate forever.
    if (knownRequests.has(id)) cancelled.add(id);
    if (cancelled.size > 2048) cancelled.delete(cancelled.keys().next().value);
    return;
  }
  if (!Number.isSafeInteger(id) || (type !== 'load' && type !== 'predict')) return;
  knownRequests.add(id);
  queue = queue.then(async () => {
    if (cancelled.has(id)) { cancelled.delete(id); knownRequests.delete(id); return; }
    try {
      if (type === 'predict' && (!LANGUAGES.has(language) || typeof word !== 'string' || !/^[a-z]{1,40}$/.test(word))) throw new Error('This word or language is not supported by the prediction model.');
      const engine = await initialize(id);
      if (cancelled.has(id)) return;
      const result = type === 'load' ? [] : await inferWord(engine, word, language, id, englishPronunciation === true);
      if (!cancelled.has(id)) self.postMessage({ id, result });
    } catch (error) {
      if (!cancelled.has(id)) self.postMessage({ id, error: error instanceof Error ? error.message : 'The typing model could not run. Please reload it.' });
    } finally {
      cancelled.delete(id);
      knownRequests.delete(id);
    }
  });
};
