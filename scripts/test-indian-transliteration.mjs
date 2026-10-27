import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import ts from 'typescript';

// Load the production engine unchanged while resolving its local TypeScript
// metadata and its real, installed transliteration dependency.
function moduleUrl(sourceUrl) {
  const javascript = ts.transpileModule(readFileSync(sourceUrl, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText.replace(/(from\s*['"])([^'"]+)(['"])/g, (_match, prefix, name, suffix) => {
    const relative = name.startsWith('.') ? new URL(name, sourceUrl) : undefined;
    const target = relative ? relative.pathname.endsWith('.ts') ? moduleUrl(relative) : relative.href : import.meta.resolve(name);
    return `${prefix}${target}${suffix}`;
  });
  return `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`;
}
const engine = await import(moduleUrl(new URL('../src/lib/indian-transliteration.ts', import.meta.url)));
const {
  TYPING_LANGUAGES, getTypingLanguage, getWordSuggestions, getKeyboard,
  transliterateText, transliterateWord, countTypingText, MAX_TYPING_CHARACTERS,
} = engine;

test('vendored runtime matches the exact published Sanscript 1.3.3 bytes', () => {
  const runtime = readFileSync(new URL('../src/vendor/sanscript/sanscript.js', import.meta.url));
  assert.equal(createHash('sha256').update(runtime).digest('hex'), '6dca053574abfb840823a2b014341468b7e247416d0e7754b6a49f76d24d0def');
  const license = readFileSync(new URL('../src/vendor/sanscript/LICENSE', import.meta.url), 'utf8');
  assert.match(license, /MIT License/);
  assert.match(license, /Copyright \(c\) 2012-present learnsanskrit\.org/);
});

test('28 distinct language choices include all 22 scheduled languages with explicit scripts', () => {
  assert.equal(TYPING_LANGUAGES.length, 28);
  assert.equal(new Set(TYPING_LANGUAGES.map(language => language.id)).size, 28);
  for (const id of ['as', 'bn', 'brx', 'doi', 'gu', 'hi', 'kn', 'ks', 'gom', 'mai', 'ml', 'mni', 'mr', 'ne', 'or', 'pa', 'sa', 'sat', 'sd', 'ta', 'te', 'ur']) {
    const language = TYPING_LANGUAGES.find(item => item.id === id);
    assert.ok(language, `${id} is available`);
    assert.ok(language.lang && language.scriptLabel && language.nativeName);
  }
  assert.equal(getTypingLanguage('ks').lang, 'ks-Arab');
  assert.equal(getTypingLanguage('sd').lang, 'sd-Arab');
  assert.equal(getTypingLanguage('ur').direction, 'rtl');
  assert.equal(getTypingLanguage('unknown').id, 'kn');
});

for (const language of TYPING_LANGUAGES) {
  test(`${language.name}: its example converts to the advertised script`, () => {
    const output = transliterateText(language.exampleRoman, language.id);
    assert.equal(output, language.exampleText);
    assert.notEqual(output, language.exampleRoman);
    assert.doesNotMatch(output, /[A-Za-z]/, 'No Roman source letters leak through the example');
    assert.equal(transliterateText(output, language.id), output, 'Native text is preserved when edited again');
  });
}

test('Kannada common spellings convert without requiring a long-vowel convention', () => {
  assert.equal(transliterateText('namaskara kannada bengaluru dhanyavada', 'kn'), 'ನಮಸ್ಕಾರ ಕನ್ನಡ ಬೆಂಗಳೂರು ಧನ್ಯವಾದ');
  assert.equal(transliterateWord('Namaste', 'kn'), 'ನಮಸ್ತೆ');
  assert.equal(transliterateText('nanna hesaru', 'kn'), 'ನನ್ನ ಹೆಸರು');
});

test('Hindi offers practical common-word spellings and typed phonetic alternatives', () => {
  assert.equal(transliterateText('aap kaise hain', 'hi'), 'आप कैसे हैं');
  assert.equal(transliterateText('mera naam', 'hi'), 'मेरा नाम');
  assert.ok(getWordSuggestions('hindi', 'hi').includes('हिन्दी'));
  assert.ok(getWordSuggestions('hindi', 'hi').includes('हिंदी'));
  assert.notEqual(transliterateText('ta', 'hi'), transliterateText('Ta', 'hi'), 'Uppercase keys retain retroflex distinctions');
});

test('Ol Chiki uses alphabetic vowels instead of retaining a spurious inherent vowel', () => {
  assert.equal(transliterateText('ka', 'sat'), 'ᱠᱚ');
  assert.equal(transliterateText('ki', 'sat'), 'ᱠᱤ');
  assert.equal(transliterateText('k', 'sat'), 'ᱠ');
  assert.equal(transliterateText('namaste', 'sat'), 'ᱱᱚᱢᱚᱥᱛᱮ');
});

test('Urdu yields unvocalized phonetic output and clearly carries an experimental note', () => {
  assert.equal(transliterateText('salaam shukriya urdu', 'ur'), 'سلام شکریہ اردو');
  assert.doesNotMatch(transliterateText('sitaara', 'ur'), /[\u064B-\u0652]/u);
  assert.ok(getTypingLanguage('ur').experimental);
  assert.match(getTypingLanguage('ur').note, /review spelling/i);
});

test('URLs, email, native text, whitespace, emoji and punctuation stay intact', () => {
  const text = 'namaste,\nhttps://example.com/namaste?q=123&lang=en user+tag@example.co.in www.example.com registerbox.in/tools नमस्ते ಕನ್ನಡ 😀 123!';
  assert.equal(transliterateText(text, 'hi'), 'नमस्ते,\nhttps://example.com/namaste?q=123&lang=en user+tag@example.co.in www.example.com registerbox.in/tools नमस्ते ಕನ್ನಡ 😀 123!');
  assert.equal(transliterateText('namaste... (namaste); 123.45', 'hi'), 'नमस्ते... (नमस्ते); 123.45');
  assert.equal(transliterateText('PDF GST PAN DOCX OTP', 'kn'), 'PDF GST PAN DOCX OTP');
});

test('English mode preserves all input exactly, including HTML-looking plain text', () => {
  const text = '<img src="x" onerror="alert(1)"> Hello ಕನ್ನಡ नमस्ते 😀\nhttps://example.com';
  assert.equal(transliterateText(text, 'kn', { englishMode: true }), text);
  const output = transliterateText('<script>alert(1)</script>', 'hi');
  assert.ok(output.includes('<') && output.includes('>'), 'Characters are handled as plain text without HTML parsing');
  assert.equal(transliterateText('', 'kn'), '');
});

test('Latin digits are default; native digit conversion leaves URL and email digits intact', () => {
  assert.equal(transliterateText('2026', 'kn'), '2026');
  assert.equal(transliterateText('2026', 'kn', { nativeDigits: true }), '೨೦೨೬');
  assert.equal(transliterateText('123', 'hi', { nativeDigits: true }), '१२३');
  assert.equal(transliterateText('123', 'ur', { nativeDigits: true }), '۱۲۳');
  assert.equal(transliterateText('123', 'sat', { nativeDigits: true }), '᱑᱒᱓');
  assert.equal(transliterateText('https://example.com/123 person123@example.com 123', 'kn', { nativeDigits: true }), 'https://example.com/123 person123@example.com ೧೨೩');
});

test('word suggestions are unique, bounded and local choices', () => {
  for (const language of TYPING_LANGUAGES) {
    const suggestions = getWordSuggestions(language.exampleRoman, language.id);
    assert.ok(suggestions.length > 0 && suggestions.length <= 6, language.name);
    assert.equal(new Set(suggestions).size, suggestions.length);
  }
  assert.equal(getWordSuggestions('namaskara', 'kn')[0], 'ನಮಸ್ಕಾರ');
  assert.deepEqual(getWordSuggestions('https://example.com', 'kn'), []);
  assert.deepEqual(getWordSuggestions('a'.repeat(81), 'hi'), []);
  assert.deepEqual(getWordSuggestions('PDF', 'hi'), []);
});

test('every language exposes a populated, deduplicated native keyboard', () => {
  for (const language of TYPING_LANGUAGES) {
    const keyboard = getKeyboard(language.id);
    assert.ok(keyboard.vowels.length > 0 && keyboard.consonants.length > 0, language.name);
    assert.equal(keyboard.digits.length, 10);
    assert.equal(new Set(keyboard.digits.map(key => key.text)).size, 10);
    for (const key of [...keyboard.vowels, ...keyboard.vowelMarks, ...keyboard.consonants, ...keyboard.signs, ...keyboard.digits]) {
      assert.ok(key.text, `${language.name} has no empty key`);
      assert.doesNotMatch(key.text, /[A-Za-z]/);
    }
  }
  assert.ok(getKeyboard('ml').signs.some(key => key.text === 'ൻ'));
  assert.ok(getKeyboard('kn').vowelMarks.some(key => key.text === 'ಾ'));
  assert.ok(getKeyboard('hi').vowelMarks.some(key => key.text === 'ि'));
});

test('the 20,000-character bound is enforced before conversion', () => {
  assert.equal(MAX_TYPING_CHARACTERS, 20_000);
  assert.doesNotThrow(() => transliterateText('a'.repeat(20_000), 'kn'));
  assert.throws(() => transliterateText('a'.repeat(20_001), 'kn'), /20,000 characters/);
  assert.throws(() => transliterateText('a'.repeat(20_001), 'kn', { englishMode: true }), /20,000 characters/);
});

test('maximum-size punctuation and malformed addresses do not trigger quadratic scans', () => {
  // This previously took ~650 ms for punctuation alone with an unanchored
  // email-pattern alternative. Warm up the parser before timing adversaries.
  transliterateText('namaste', 'hi');
  for (const text of ['.'.repeat(20_000), 'a.'.repeat(10_000), `${'a'.repeat(19_998)}.@`, '@'.repeat(20_000)]) {
    const start = performance.now();
    const output = transliterateText(text, 'hi');
    const elapsed = performance.now() - start;
    assert.ok(output.length > 0);
    assert.ok(elapsed < 150, `20,000 characters took ${elapsed.toFixed(1)} ms`);
  }
});

test('counts preserve Unicode letters and do not split emoji surrogate pairs', () => {
  assert.deepEqual(countTypingText(''), { words: 0, characters: 0 });
  assert.deepEqual(countTypingText('a 😀'), { words: 2, characters: 3 });
  assert.equal(countTypingText('ನಮಸ್ಕಾರ\nನಮಸ್ತೆ').words, 2);
});
