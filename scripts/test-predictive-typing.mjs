import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Exercise the production TypeScript modules without maintaining a parallel
// test implementation or requiring an app/browser just to test orchestration.
function moduleUrl(sourceUrl) {
  const javascript = ts.transpileModule(readFileSync(sourceUrl, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText.replace(/(^(?:import|export)[^\n]*?\sfrom\s*['"])([^'"\n]+)(['"])/gm, (_match, prefix, name, suffix) => {
    const relative = name.startsWith('.') ? new URL(name, sourceUrl) : undefined;
    const target = relative ? relative.pathname.endsWith('.ts') ? moduleUrl(relative) : relative.href : import.meta.resolve(name);
    return `${prefix}${target}${suffix}`;
  });
  return `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`;
}
const { createPredictiveTyping, updateTypingChoices, usesEnglishPronunciation } = await import(moduleUrl(new URL('../src/lib/predictive-typing.ts', import.meta.url)));
const corpus = JSON.parse(readFileSync(new URL('../docs/typing-quality-cases.json', import.meta.url), 'utf8'));

function fixture() {
  const calls = [];
  const answers = {
    kn: { tea: ['ಟೀ', 'ಟೆ'], day: ['ಡೇ', 'ದಯ್'] },
    hi: { tea: ['टी'], day: ['डे'], hey: ['हे'], my: ['माय'], name: ['नेम'], is: ['इज़'], nirmal: ['निर्मल'], mera: ['मेरा'], naam: ['नाम'], hai: ['है'] },
  };
  const engine = createPredictiveTyping(async (word, language, options) => {
    calls.push({ word, language, signal: options.signal, englishPronunciation: options.englishPronunciation });
    return answers[language]?.[word] ?? [];
  });
  return { engine, calls };
}

test('the reported phrase is composed from actual preferred candidates', async () => {
  const { engine, calls } = fixture();
  assert.equal(await engine.convert('tea day', 'kn'), 'ಟೀ ಡೇ');
  assert.deepEqual(calls.map(({ word, language }) => [word, language]), [['tea', 'kn'], ['day', 'kn']]);
  assert.deepEqual(engine.peek('tea', 'kn'), ['ಟೀ', 'ಟೆ']);
});

for (const item of corpus.phraseCases) {
  test(`phrase boundaries and protected text: ${item.id}`, async () => {
    const { engine, calls } = fixture();
    assert.equal(await engine.convert(item.source, item.language, { englishPronunciation: item.inputStyle === 'english' }), item.expected);
    if (item.language === 'kn') assert.ok(calls.every(call => ['tea', 'day'].includes(call.word)), 'Protected address parts and fixed acronyms must never reach the predictor');
  });
}

test('preview preserves unknown words until real predictions exist', async () => {
  const { engine } = fixture();
  assert.equal(engine.preview('tea day', 'kn'), 'tea day');
  await engine.candidates('tea', 'kn');
  assert.equal(engine.preview('tea day', 'kn'), 'ಟೀ day');
  assert.equal(engine.preview('tea day', 'kn', { englishMode: true }), 'tea day');
});

test('repeated words and case variants share a bounded per-language cache', async () => {
  const { engine, calls } = fixture();
  assert.equal(await engine.convert('Tea TEA tea day day', 'kn'), 'ಟೀ ಟೀ ಟೀ ಡೇ ಡೇ');
  assert.equal(calls.length, 2);
  assert.equal(await engine.convert('tea', 'kn'), 'ಟೀ');
  assert.equal(calls.length, 2);
  assert.equal(await engine.convert('tea', 'hi'), 'टी');
  assert.equal(calls.length, 3, 'A Kannada cache entry must not answer Hindi');
});

test('explicit Indian words and English sounds retain separate candidate caches', async () => {
  const calls = [];
  const engine = createPredictiveTyping(async (word, language, options) => {
    calls.push({ word, language, english: options.englishPronunciation });
    return [options.englishPronunciation ? 'मेन' : 'मैं'];
  });
  assert.equal(await engine.convert('main', 'hi'), 'मैं');
  assert.equal(await engine.convert('main', 'hi', { englishPronunciation: true }), 'मेन');
  assert.equal(engine.preview('main', 'hi'), 'मैं');
  assert.equal(engine.preview('main', 'hi', { englishPronunciation: true }), 'मेन');
  assert.deepEqual(await engine.candidates('main', 'hi', undefined, true), ['मेन']);
  assert.deepEqual(engine.peek('main', 'hi', true), ['मेन']);
  assert.equal(calls.length, 2, 'An English spelling cannot overwrite the same native-style word');
});

test('Auto uses distinct English markers and exposes deterministic explicit overrides', () => {
  assert.equal(usesEnglishPronunciation('hey my name is nirmal', 'auto'), true);
  assert.equal(usesEnglishPronunciation('mera naam nirmal hai', 'auto'), false);
  assert.equal(usesEnglishPronunciation('my my my', 'auto'), false, 'A repeated ambiguous word is insufficient');
  assert.equal(usesEnglishPronunciation('namaste https://example.com/my/name user.is@example.com', 'auto'), false, 'Addresses cannot trigger an English profile');
  assert.equal(usesEnglishPronunciation('hey my name is nirmal', 'indian'), false);
  assert.equal(usesEnglishPronunciation('main', 'english'), true);
  assert.equal(usesEnglishPronunciation('', 'auto'), false);
});

test('word mode leaves the unfinished Roman word intact and commits at punctuation or space', async () => {
  const { engine, calls } = fixture();
  assert.equal(await engine.convert('tea day', 'kn', { finishLastWord: false }), 'ಟೀ day');
  assert.deepEqual(calls.map(call => call.word), ['tea']);
  assert.equal(await engine.convert('tea day ', 'kn', { finishLastWord: false }), 'ಟೀ ಡೇ ');
  assert.equal(await engine.convert('tea day!', 'kn', { finishLastWord: false }), 'ಟೀ ಡೇ!');
  assert.equal(engine.preview('tea day', 'kn', { finishLastWord: false }), 'ಟೀ day', 'A cached word must still respect the selected timing');
});

test('native digit conversion preserves digits inside addresses and native text', async () => {
  const { engine, calls } = fixture();
  assert.equal(await engine.convert('tea 123 https://example.com/123 user123@example.com ಕನ್ನಡ ೪ day', 'kn', { nativeDigits: true }), 'ಟೀ ೧೨೩ https://example.com/123 user123@example.com ಕನ್ನಡ ೪ ಡೇ');
  assert.deepEqual(calls.map(call => call.word), ['tea', 'day']);
});

test('English preview preserves input exactly without prediction work', async () => {
  const { engine, calls } = fixture();
  const source = '<script>alert(1)</script> tea 😀\nhttps://example.com';
  assert.equal(await engine.convert(source, 'kn', { englishMode: true }), source);
  assert.equal(calls.length, 0);
});

test('unsupported tokens and missing candidates stay literal instead of receiving approximate rule output', async () => {
  const { engine, calls } = fixture();
  const longWord = 'a'.repeat(41);
  assert.equal(await engine.convert(`~n a^i ${longWord} unknown tea`, 'kn'), `~n a^i ${longWord} unknown ಟೀ`);
  assert.deepEqual(calls.map(call => call.word), ['unknown', 'tea']);
  assert.deepEqual(await engine.candidates('PDF', 'kn'), [], 'Direct candidate requests may return no predictions without changing the source');
});

test('ranked candidates are unique, bounded and reject invalid provider values', async () => {
  const engine = createPredictiveTyping(async () => ['', 'ಟೀ', 'ಟೀ', null, 'x'.repeat(161), 'ಡೇ', 'ಮೂರು', 'ನಾಲ್ಕು', 'ಐದು', 'ಆರು']);
  assert.deepEqual(await engine.candidates('tea', 'kn'), ['ಟೀ', 'ಡೇ', 'ಮೂರು', 'ನಾಲ್ಕು', 'ಐದು']);
});

test('conversion progress counts distinct predicted words, not native text or addresses', async () => {
  const { engine } = fixture();
  const progress = [];
  await engine.convert('tea tea ಕನ್ನಡ https://example.com day', 'kn', { onProgress: (completed, total) => progress.push([completed, total]) });
  assert.deepEqual(progress, [[1, 2], [2, 2]]);
});

test('an already aborted request never reaches the predictor, including a cache hit', async () => {
  const { engine, calls } = fixture();
  await engine.candidates('tea', 'kn');
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(engine.candidates('tea', 'kn', controller.signal), { name: 'AbortError' });
  await assert.rejects(engine.convert('tea', 'kn', { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(calls.length, 1);
});

test('an aborted in-flight response cannot poison the cache or resolve the conversion', async () => {
  let release;
  const controller = new AbortController();
  const engine = createPredictiveTyping(() => new Promise(resolve => { release = resolve; }));
  const conversion = engine.convert('tea', 'kn', { signal: controller.signal });
  controller.abort();
  release(['OLD']);
  await assert.rejects(conversion, { name: 'AbortError' });
  assert.equal(engine.peek('tea', 'kn'), undefined);
});

test('predictor failures propagate visibly and can be retried rather than cached as success', async () => {
  let calls = 0;
  const engine = createPredictiveTyping(async () => {
    calls++;
    if (calls === 1) throw new Error('Model unavailable');
    return ['ಟೀ'];
  });
  await assert.rejects(engine.convert('tea', 'kn'), /Model unavailable/);
  assert.equal(engine.peek('tea', 'kn'), undefined);
  assert.equal(await engine.convert('tea', 'kn'), 'ಟೀ');
  assert.equal(calls, 2);
});

test('input bounds apply before any work in live, on-space and English modes', async () => {
  const { engine, calls } = fixture();
  const oversized = 'a'.repeat(20_001);
  for (const options of [{}, { finishLastWord: false }, { englishMode: true }]) {
    await assert.rejects(engine.convert(oversized, 'kn', options), /20,000 characters/);
    assert.throws(() => engine.preview(oversized, 'kn', options), /20,000 characters/);
  }
  assert.equal(calls.length, 0);
});

test('the cache does not retain an unbounded typing history', async () => {
  const calls = [];
  const engine = createPredictiveTyping(async word => { calls.push(word); return [`(${word})`]; });
  function alphabeticId(number) {
    let word = '';
    do { word += String.fromCharCode(97 + number % 26); number = Math.floor(number / 26); } while (number);
    return `word${word}`;
  }
  for (let index = 0; index < 601; index++) await engine.candidates(alphabeticId(index), 'kn');
  assert.equal(engine.peek(alphabeticId(0), 'kn'), undefined);
  assert.deepEqual(engine.peek(alphabeticId(600), 'kn'), [`(${alphabeticId(600)})`]);
  await engine.candidates(alphabeticId(0), 'kn');
  assert.equal(calls.length, 602);
});


test('a selected spelling changes only its result occurrence and keeps the English source', async () => {
  const {engine} = fixture();
  const source = 'tea https://example.com day tea';
  const choices = [{start:0,end:3,roman:'tea',value:'ಟೆ',languageId:'kn'}];
  assert.equal(await engine.convert(source, 'kn', {choices}), 'ಟೆ https://example.com ಡೇ ಟೀ');
  assert.equal(source, 'tea https://example.com day tea');
  assert.equal(await engine.convert(source, 'hi', {choices}), 'टी https://example.com डे टी');
  assert.equal(await engine.convert('tea', 'kn', {choices, finishLastWord:false}), 'ಟೆ');
  assert.equal(await engine.convert('tea', 'kn', {choices, englishMode:true}), 'tea');
});

test('chosen word offsets survive unrelated edits and invalidate changed/merged words', () => {
  const choice = {start:4,end:7,roman:'tea',value:'ಟೆ',languageId:'kn'};
  assert.deepEqual(updateTypingChoices('day tea', 'new day tea', [choice]), [{...choice,start:8,end:11}]);
  assert.deepEqual(updateTypingChoices('day tea', 'tea', [choice]), [{...choice,start:0,end:3}]);
  assert.deepEqual(updateTypingChoices('day tea', 'day tea day', [choice]), [choice]);
  assert.deepEqual(updateTypingChoices('day tea', 'day team', [choice]), []);
  assert.deepEqual(updateTypingChoices('day tea', 'day te', [choice]), []);
  assert.deepEqual(updateTypingChoices('day tea', 'day atea', [choice]), []);
});

test('hi greetings use English pronunciation in Auto regardless of case', () => {
  for (const source of ['hi','HI','hi!','hello']) assert.equal(usesEnglishPronunciation(source, 'auto'), true);
  assert.equal(usesEnglishPronunciation('hi', 'indian'), false);
});
