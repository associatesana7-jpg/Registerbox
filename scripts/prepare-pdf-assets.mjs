// Keep PDF.js runtime assets on our origin and exactly matched to the parser.
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const source = dirname(require.resolve('pdfjs-dist/package.json'));
const target = fileURLToPath(new URL('../public/vendor/pdfjs/', import.meta.url));
const { version } = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'));
await mkdir(target, { recursive: true });
for (const folder of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  await rm(join(target, folder), { recursive: true, force: true });
  await cp(join(source, folder), join(target, folder), { recursive: true });
}
await cp(join(source, 'legacy/build/pdf.worker.min.mjs'), join(target, 'pdf.worker.min.mjs'));
await cp(join(source, 'LICENSE'), join(target, 'LICENSE'));
await writeFile(join(target, 'version.json'), `${JSON.stringify({ version })}\n`);
console.log(`Prepared same-origin PDF.js ${version} worker, fonts and decoders.`);
