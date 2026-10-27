// Ship a pinned, integrity-checked IndicXlit model and its WASM runtime on our origin.
// The model archive is data only; its JavaScript is never loaded or executed.
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const target = fileURLToPath(new URL('../public/vendor/typing/', import.meta.url));
const require = createRequire(import.meta.url);
const ortRoot = dirname(dirname(require.resolve('onnxruntime-web')));
const modelArchive = 'https://registry.npmjs.org/@cloudrumbles/indic-transliterate/-/indic-transliterate-1.2.2.tgz';
const modelIntegrity = 'RIdwooIou/T7QGkoM9zuIDn3gO+aRe2TiPxCbpSfSfevO3mxnf6qSclzPmGhCdDXu81PzuMCWxd6xfQBdEIoeA==';
const files = {
  'indicxlit_encoder.onnx': '468cfd76d779ec3bebcc7aa10f852b7f66de2c5133feba3537d18496db58c6c0',
  'indicxlit_decoder_v2.onnx': 'b811bcad8521849f17c7a02997465093639d7bbc76fae49c1b137b8f72df8f83',
  'vocab.json': 'f711ffc2b2ab97e85486798beb8b344ff80b48692aef46557f40c600df1dc697',
};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
await mkdir(target, { recursive: true });
const existing = await Promise.all(Object.entries(files).map(async ([name, checksum]) => {
  try { return hash(await readFile(join(target, name))) === checksum; } catch { return false; }
}));
if (!existing.every(Boolean)) {
  const response = await fetch(modelArchive, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`IndicXlit model download failed: ${response.status}`);
  const compressed = Buffer.from(await response.arrayBuffer());
  if (compressed.length > 55_000_000 || createHash('sha512').update(compressed).digest('base64') !== modelIntegrity) {
    throw new Error('IndicXlit model archive integrity check failed.');
  }
  const tar = gunzipSync(compressed, { maxOutputLength: 55_000_000 });
  const found = new Set();
  for (let offset = 0; offset + 512 <= tar.length;) {
    const name = tar.subarray(offset, offset + 100).toString('utf8').replace(/\0.*$/s, '');
    if (!name) break;
    const size = Number.parseInt(tar.subarray(offset + 124, offset + 136).toString('ascii').replace(/\0.*$/s, '').trim(), 8);
    if (!Number.isSafeInteger(size) || size < 0 || offset + 512 + size > tar.length) throw new Error('Invalid pinned model archive.');
    const expectedName = name.startsWith('package/models/') ? name.slice('package/models/'.length) : '';
    if (Object.hasOwn(files, expectedName)) {
      const contents = tar.subarray(offset + 512, offset + 512 + size);
      if (hash(contents) !== files[expectedName]) throw new Error(`Model checksum mismatch: ${expectedName}`);
      await writeFile(join(target, expectedName), contents);
      found.add(expectedName);
    }
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  if (found.size !== Object.keys(files).length) throw new Error('Pinned model archive is missing required assets.');
}
for (const name of ['ort.wasm.min.js', 'ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.mjs']) {
  await cp(join(ortRoot, 'dist', name), join(target, name));
}
// The npm distribution omits LICENSE; keep the exact upstream v1.31.1 MIT
// notice in source rather than downloading legal metadata on every build.
await cp(new URL('./licenses/onnxruntime-LICENSE', import.meta.url), join(target, 'ONNX-RUNTIME-LICENSE'));
await cp(new URL('./typing-model-worker.js', import.meta.url), join(target, 'typing-model-worker.js'));
await writeFile(join(target, 'INDICXLIT-LICENSE'), `MIT License\n\nCopyright (c) 2022 AI4Bhārat\nCopyright (c) 2025 cloudrumbles (ONNX conversion)\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n`);
const { version } = JSON.parse(await readFile(join(ortRoot, 'package.json'), 'utf8'));
await writeFile(join(target, 'provenance.json'), `${JSON.stringify({
  model: 'AI4Bharat IndicXlit v1.0',
  source: 'https://github.com/AI4Bharat/IndicXlit',
  onnxConversion: '@cloudrumbles/indic-transliterate@1.2.2',
  archive: modelArchive,
  integrity: `sha512-${modelIntegrity}`,
  files,
  onnxRuntime: version,
})}\n`);
console.log(`Prepared same-origin IndicXlit model and ONNX Runtime ${version}.`);
