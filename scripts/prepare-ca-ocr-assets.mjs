// Install pinned OCR assets on our origin. No runtime CDN or paid service is used.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const destination = fileURLToPath(new URL('../public/vendor/ca-ocr/', import.meta.url));
const engine = 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/';
const core = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0/';
// SHA-256 values from the exact published packages; refuse changed bytes.
const assets = [
  ['tesseract.min.js', engine + 'dist/tesseract.min.js', 'EP/3hIQGd1nEMCigKnLXbQuQ6xcwK7I7WKnsVBC8kos='],
  ['worker.min.js', engine + 'dist/worker.min.js', 'OGRVmQQyOcDrbbCKZQSpLc3CkiAFNfPpM5zXfERDuEI='],
  ['LICENSE-tesseract.md', engine + 'LICENSE.md', 'tAkwu8+AdEyGxGoSvJ2gVmQdcicWw3j1ZZueVV74M+E='],
  ['LICENSE-core', core + 'LICENSE', 'xllut76FgcGL5zbIRvuRc7aezPbvlMUTWJPsVr2Sugg='],
  ['tesseract.min.js.LICENSE.txt', engine + 'dist/tesseract.min.js.LICENSE.txt', 'zfljztfSWg+YkBpUdke01uLb4Bl/14yHoFmoew5UL+I='],
  ['worker.min.js.LICENSE.txt', engine + 'dist/worker.min.js.LICENSE.txt', 'RfVBca6qHRDAwaZvN0t7uh8CRysUh/voku7AT4QAAqw='],
  ['eng.traineddata.gz', 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int/eng.traineddata.gz', 'RbTLNGckrBd08cNvQvGCuIe82yjr5j5v/5CsQfP8/5E='],
  ['tesseract-core.wasm.js', core + 'tesseract-core.wasm.js', '5mhy9qdvWtQU1z0hUSJF3w3jBgrUhxqXxH786qsnuVU='],
  ['tesseract-core.wasm', core + 'tesseract-core.wasm', 'dA9+RmovAm4fHlSi4NmVfjhtgWYRDRKQIkq9PQiYYQY='],
  ['tesseract-core-lstm.wasm.js', core + 'tesseract-core-lstm.wasm.js', 'd1o1328q4QDgJglEPmvVyvzQeYPdYXVFTKSkMqdzBoc='],
  ['tesseract-core-lstm.wasm', core + 'tesseract-core-lstm.wasm', 'Ig4uh1Ue3MuFUZeWoXBGn4qyqAVSFnieO4sa2hi3vCs='],
  ['tesseract-core-simd.wasm.js', core + 'tesseract-core-simd.wasm.js', 'OwZ4xHqN6mq7kxshQXHAi3QqW5qfy7saAooI1d5unUw='],
  ['tesseract-core-simd.wasm', core + 'tesseract-core-simd.wasm', 'yhHukqAgI+T1CD7v0JZvuDspdBbaVOmXufbORF9xnJs='],
  ['tesseract-core-simd-lstm.wasm.js', core + 'tesseract-core-simd-lstm.wasm.js', 'nXxD+yBtyfSEdSKLRr81+Ij6nmJZ2i5n1adcdwSfLcc='],
  ['tesseract-core-simd-lstm.wasm', core + 'tesseract-core-simd-lstm.wasm', 'GH12dC38DYkp8LSaYZ8UW7Y3BzB3bHvQ0+IMayCYgI0='],
];
const digest = bytes => createHash('sha256').update(bytes).digest('base64');
await mkdir(destination, { recursive: true });
for (const [name, url, expected] of assets) {
  const target = new URL(name, new URL('../public/vendor/ca-ocr/', import.meta.url));
  try { if (digest(await readFile(target)) === expected) continue; } catch { /* Fetch missing or invalid asset. */ }
  let bytes;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(90_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > 16_000_000 || digest(bytes) !== expected) throw new Error('Asset checksum mismatch');
      break;
    } catch (error) { if (attempt === 2) throw new Error(`Cannot prepare ${name}: ${error.message}`); }
  }
  await writeFile(target, bytes);
}
await writeFile(new URL('../public/vendor/ca-ocr/version.json', import.meta.url), JSON.stringify({ tesseract: '6.0.1', core: '6.0.0', language: 'eng 1.0.0 best_int', sha256: Object.fromEntries(assets.map(([name,, hash]) => [name, hash])) }) + '\n');
console.log('Prepared verified same-origin Tesseract 6.0.1 OCR assets.');
