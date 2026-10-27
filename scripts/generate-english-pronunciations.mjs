import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

// This is a general English pronunciation channel, not a list of exceptions
// fitted to our examples. Every eligible word in the pinned upstream dictionary
// is processed using the same ARPAbet-to-Roman mapping. IndicXlit still decides
// the native-script spellings; these aliases only supply pronunciation inputs.
const revision = '74790861f652b15e4ac49015a90074ad62a27690';
const upstream = `https://raw.githubusercontent.com/cmusphinx/cmudict/${revision}/`;
const sourceHash = '81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22';
const licenseHash = 'bd4ce8e44170a5f9f481310ca85c51de3c4f851a65e679b40e603b143bd3542a';
const output = new URL('../public/vendor/typing-lexicons/', import.meta.url);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

// Stress is removed after parsing; this channel expresses segment sounds,
// rather than claiming to preserve English stress or native-language prosody.
const phones = {
  AA: 'aa', AE: 'a', AH: 'a', AO: 'o', AW: 'au', AY: 'aay',
  B: 'b', CH: 'ch', D: 'd', DH: 'd', EH: 'e', ER: 'ar', EY: 'e',
  F: 'f', G: 'g', HH: 'h', IH: 'i', IY: 'ee', JH: 'j', K: 'k',
  L: 'l', M: 'm', N: 'n', NG: 'ng', OW: 'o', OY: 'oy', P: 'p',
  R: 'r', S: 's', SH: 'sh', T: 't', TH: 'th', UH: 'u', UW: 'oo',
  V: 'v', W: 'w', Y: 'y', Z: 'z', ZH: 'zh',
};

async function pinnedFile(name, expected, suppliedPath) {
  const bytes = suppliedPath ? await readFile(suppliedPath) : Buffer.from(await (async () => {
    const response = await fetch(`${upstream}${name}`);
    if (!response.ok) throw new Error(`Could not download the pinned CMUdict ${name}: ${response.status}`);
    return response.arrayBuffer();
  })());
  if (sha256(bytes) !== expected) throw new Error(`CMUdict ${name} failed its pinned SHA-256 check.`);
  return bytes;
}

// Optional local source paths permit a verified, fully offline regeneration:
// node scripts/generate-english-pronunciations.mjs cmudict.dict LICENSE
const [source, license] = await Promise.all([
  pinnedFile('cmudict.dict', sourceHash, process.argv[2]),
  pinnedFile('LICENSE', licenseHash, process.argv[3]),
]);
const entries = new Map();
const phonemeFeatures = new Map();
let pronunciations = 0;
for (const line of source.toString('utf8').split('\n')) {
  const match = /^([^\s]+)\s+(.+?)(?:\s+#.*)?$/.exec(line);
  if (!match) continue;
  const word = match[1].replace(/\([0-9]+\)$/, '').toLowerCase();
  if (!/^[a-z]{1,40}$/.test(word)) continue;
  const phonemes = match[2].split(/\s+/).map(value => value.replace(/[012]$/, ''));
  const missing = phonemes.find(value => !Object.hasOwn(phones, value));
  if (missing) throw new Error(`Unknown upstream ARPAbet phoneme ${missing} for ${word}. Review the pinned dictionary before changing the mapping.`);
  // Keep the source distinctions that the simple Roman alias cannot express:
  // in particular English D is distinct from the DH phone in "the".
  const mask = (phonemes.includes('T') ? 1 : 0) | (phonemes.includes('D') ? 2 : 0) | (phonemes.includes('Z') ? 4 : 0);
  if (mask) phonemeFeatures.set(word, (phonemeFeatures.get(word) ?? 0) | mask);
  const roman = phonemes.map(value => phones[value]).join('');
  // An identical alias adds no pronunciation information; keeping up to two
  // distinct variants also bounds the additional inference work per word.
  if (roman === word || roman.length > 40) continue;
  const variants = entries.get(word) ?? [];
  if (variants.length < 2 && !variants.includes(roman)) {
    variants.push(roman);
    entries.set(word, variants);
    pronunciations++;
  }
}
if (entries.size < 100_000) throw new Error('The pinned pronunciation dictionary unexpectedly contains fewer than 100,000 eligible entries.');
const dictionary = Object.fromEntries([...entries].sort(([left], [right]) => left.localeCompare(right, 'en')));
const data = Buffer.from(JSON.stringify(dictionary) + '\n');
const compressed = gzipSync(data, { level: 9, mtime: 0 });
const features = Object.fromEntries([...phonemeFeatures].sort(([left], [right]) => left.localeCompare(right, 'en')));
const featureData = Buffer.from(JSON.stringify(features) + '\n');
const featureCompressed = gzipSync(featureData, { level: 9, mtime: 0 });
if (compressed.length > 780_000) throw new Error('The compressed pronunciation asset exceeded its reviewed deployment size.');
await mkdir(output, { recursive: true });
await writeFile(new URL('english-pronunciations.json', output), data);
await writeFile(new URL('english-pronunciations.json.gz', output), compressed);
await writeFile(new URL('english-phoneme-features.json', output), featureData);
await writeFile(new URL('english-phoneme-features.json.gz', output), featureCompressed);
await writeFile(new URL('CMUDICT-LICENSE.txt', output), license);
await writeFile(new URL('english-pronunciations-manifest.json', output), JSON.stringify({
  schemaVersion: 1,
  name: 'CMU Pronouncing Dictionary pronunciation aliases',
  sourceRepository: 'https://github.com/cmusphinx/cmudict',
  revision,
  sourceUrl: `${upstream}cmudict.dict`,
  sourceSha256: sourceHash,
  licenseUrl: `${upstream}LICENSE`,
  licenseSha256: licenseHash,
  license: 'CMUdict permissive BSD-style license; exact conditions are in CMUDICT-LICENSE.txt',
  attribution: 'Copyright (C) 1993-2015 Carnegie Mellon University. All rights reserved.',
  derivation: 'All ASCII alphabetic words up to 40 characters; ARPAbet segment phones mapped with the same table for every word; stress omitted; at most two distinct aliases per word; unchanged aliases omitted.',
  phones,
  entries: entries.size,
  pronunciations,
  artifact: { path: 'english-pronunciations.json', bytes: data.length, sha256: sha256(data) },
  compressedArtifact: { path: 'english-pronunciations.json.gz', encoding: 'gzip', bytes: compressed.length, sha256: sha256(compressed) },
  phonemeFeatures: {
    description: 'Word-level union of original ARPAbet phonemes across all eligible source pronunciations. DH does not set the D bit. This preserves phoneme distinctions for a uniform candidate-fidelity preference.',
    bitmask: { T: 1, D: 2, Z: 4 },
    entries: phonemeFeatures.size,
    artifact: { path: 'english-phoneme-features.json', bytes: featureData.length, sha256: sha256(featureData) },
    compressedArtifact: { path: 'english-phoneme-features.json.gz', encoding: 'gzip', bytes: featureCompressed.length, sha256: sha256(featureCompressed) },
  },
  limits: 'Pronunciation alternatives represent US English dictionary entries and may differ from Indian English usage. They are candidate inputs, not certified spellings, translations or contextual grammar correction.',
}, null, 2) + '\n');
console.log(JSON.stringify({ output: fileURLToPath(output), entries: entries.size, pronunciations, bytes: data.length, sha256: sha256(data), gzipBytes: compressed.length, gzipSha256: sha256(compressed), features: { entries: phonemeFeatures.size, gzipBytes: featureCompressed.length, gzipSha256: sha256(featureCompressed) }, examples: Object.fromEntries(['tea', 'day', 'my', 'name', 'is', 'hey', 'coffee', 'school', 'bank'].map(word => [word, dictionary[word]])) }));
