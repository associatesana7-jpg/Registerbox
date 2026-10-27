import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import JSZip from 'jszip';
import { zipSync } from 'fflate';
import ts from 'typescript';

// Execute the shipped guards with their real compression code. Transpilation
// only resolves browser TypeScript imports in this Node test process.
function moduleUrl(sourceUrl) {
  const javascript = ts.transpileModule(readFileSync(sourceUrl, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText.replace(/((?:from\s*|import\(\s*)['"])([^'"]+)(['"])/g, (_match, prefix, name, suffix) => {
    let target;
    if (name.startsWith('.')) {
      let relative = new URL(name, sourceUrl);
      if (!existsSync(relative) && existsSync(`${relative.pathname}.ts`)) relative = new URL(`${relative.href}.ts`);
      target = relative.pathname.endsWith('.ts') ? moduleUrl(relative) : relative.href;
    } else target = import.meta.resolve(name);
    return `${prefix}${target}${suffix}`;
  });
  return `data:text/javascript;base64,${Buffer.from(`${javascript}\n//# sourceURL=${sourceUrl.pathname}.security-test.js`).toString('base64')}`;
}
const archive = await import(moduleUrl(new URL('../src/lib/converter-archive.ts', import.meta.url)));
const images = await import(moduleUrl(new URL('../src/lib/converter-images.web.ts', import.meta.url)));
const office = await import(moduleUrl(new URL('../src/lib/office-converter.web.ts', import.meta.url)));
const encode = text => new TextEncoder().encode(text);
const options = { maxUncompressedBytes: 32_000 };
const invalid = /archive|metadata|damaged|ambiguous|duplicate|safety|limit|inconsistent/i;

function zipLayout(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  while (view.getUint32(end, true) !== 0x06054b50) end--;
  const entries = [];
  let central = view.getUint32(end + 16, true);
  for (let count = view.getUint16(end + 10, true); count > 0; count--) {
    const local = view.getUint32(central + 42, true);
    const localNameLength = view.getUint16(local + 26, true);
    const localExtraLength = view.getUint16(local + 28, true);
    const nameLength = view.getUint16(central + 28, true);
    entries.push({ central, local, nameLength, data: local + 30 + localNameLength + localExtraLength });
    central += 46 + nameLength + view.getUint16(central + 30, true) + view.getUint16(central + 32, true);
  }
  return { view, entries };
}

function pngHeader(width = 40, height = 20) {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13);
  bytes.set(encode('IHDR'), 12);
  view.setUint32(16, width);
  view.setUint32(20, height);
  bytes.set([8, 2, 0, 0, 0], 24);
  return bytes;
}

function wordArchive(extra = {}) {
  return zipSync({
    '[Content_Types].xml': encode('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'),
    'word/document.xml': encode('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Safe content</w:t></w:r></w:p></w:body></w:document>'),
    ...extra,
  });
}

test('valid JSZip streamed descriptors and Unicode names survive the bounded reader', async () => {
  const zip = new JSZip();
  zip.file('word/document.xml', '<document>Safe text</document>');
  zip.file('word/media/Café-தமிழ்.txt', 'Unicode content');
  const bytes = await zip.generateAsync({ type: 'uint8array', streamFiles: true, compression: 'DEFLATE' });
  const entries = await archive.unzipConverterArchive(bytes, options);
  assert.equal(new TextDecoder().decode(entries['word/document.xml']), '<document>Safe text</document>');
  assert.equal(new TextDecoder().decode(entries['word/media/Café-தமிழ்.txt']), 'Unicode content');
});

test('aliased central entries sharing one local header reject before any entry is inflated', async () => {
  const bytes = zipSync({ 'first.txt': encode('first'), 'other.txt': encode('other') });
  const { view, entries: [first, second] } = zipLayout(bytes);
  bytes.copyWithin(second.central + 46, first.central + 46, first.central + 46 + first.nameLength);
  view.setUint32(second.central + 42, first.local, true);
  let visited = 0;
  await assert.rejects(archive.unzipConverterArchive(bytes, { ...options, filter: () => { visited++; return true; } }), invalid);
  assert.equal(visited, 0, 'All central/local metadata is checked before inflation starts');
});

test('local filename disagreement, case aliases and unsafe paths reject before inflation', async () => {
  const mismatch = zipSync({ 'first.txt': encode('first') });
  const { entries: [first] } = zipLayout(mismatch);
  mismatch[first.local + 30] = 'x'.charCodeAt(0);
  await assert.rejects(archive.unzipConverterArchive(mismatch, options), invalid);
  await assert.rejects(archive.unzipConverterArchive(zipSync({ 'word/Name.txt': encode('one'), 'word/name.txt': encode('two') }), options), invalid);
  await assert.rejects(archive.unzipConverterArchive(zipSync({ '../escape.txt': encode('bad') }), options), /unsafe|path|ambiguous/i);
});

test('STORED size mismatch rejects even when local and central metadata agree with each other', async () => {
  const bytes = zipSync({ 'payload.txt': [encode('Safe payload'), { level: 0 }] });
  const { view, entries: [entry] } = zipLayout(bytes);
  view.setUint32(entry.central + 24, 1, true);
  view.setUint32(entry.local + 22, 1, true);
  await assert.rejects(archive.unzipConverterArchive(bytes, options), invalid);
});

test('DEFLATE output cannot exceed a forged original size or evade the real output budget', async () => {
  const bytes = zipSync({ 'payload.txt': encode('A'.repeat(4_096)) });
  const { view, entries: [entry] } = zipLayout(bytes);
  assert.equal(view.getUint16(entry.central + 10, true), 8);
  view.setUint32(entry.central + 24, 1, true);
  view.setUint32(entry.local + 22, 1, true);
  await assert.rejects(archive.unzipConverterArchive(bytes, { maxUncompressedBytes: 128 }), invalid);
});

test('CRC checks detect altered stored bytes and forged DEFLATE checksums', async () => {
  const stored = zipSync({ 'payload.txt': [encode('Safe payload'), { level: 0 }] });
  const storedEntry = zipLayout(stored).entries[0];
  stored[storedEntry.data] ^= 1;
  await assert.rejects(archive.unzipConverterArchive(stored, options), invalid);
  const compressed = zipSync({ 'payload.txt': encode('A'.repeat(1_024)) });
  const { view, entries: [entry] } = zipLayout(compressed);
  const incorrect = (view.getUint32(entry.central + 16, true) ^ 1) >>> 0;
  view.setUint32(entry.central + 16, incorrect, true);
  view.setUint32(entry.local + 14, incorrect, true);
  await assert.rejects(archive.unzipConverterArchive(compressed, options), invalid);
});

test('filtered archive files still consume the decompression budget and undergo CRC checks', async () => {
  const bytes = zipSync({ 'kept.txt': encode('kept'), 'ignored.bin': [encode('Not retained but still validated'), { level: 0 }] });
  const { entries } = zipLayout(bytes);
  bytes[entries[1].data] ^= 1;
  await assert.rejects(archive.unzipConverterArchive(bytes, { ...options, filter: entry => entry.name === 'kept.txt' }), invalid);
  await assert.rejects(archive.unzipConverterArchive(zipSync({ 'ignored.bin': encode('A'.repeat(512)) }), { maxUncompressedBytes: 128, filter: () => false }), /safety|limit|expand/i);
});

test('raster inspection uses bytes and rejects tiny headers declaring huge images', () => {
  assert.deepEqual(images.inspectConverterRaster(pngHeader()), { kind: 'png', width: 40, height: 20 });
  assert.equal(images.inspectConverterRaster(encode('<svg xmlns="http://www.w3.org/2000/svg"/>')), null);
  assert.throws(() => images.inspectConverterRaster(pngHeader(6_000, 6_000)), /24|megapixel|resize/i);
  assert.throws(() => images.inspectConverterRaster(pngHeader(20_001, 1)), /20,000|resize/i);
  assert.throws(() => images.inspectConverterRaster(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])), /header|damaged/i);
});

test('thumbnail selection rejects renamed SVG and oversized raster bytes before browser decode or object URLs', async () => {
  const calls = { bitmap: 0, image: 0, url: 0, canvas: 0 };
  const originals = { bitmap: globalThis.createImageBitmap, image: globalThis.Image, document: globalThis.document, url: URL.createObjectURL };
  globalThis.createImageBitmap = async () => { calls.bitmap++; throw new Error('Unexpected image decoding'); };
  globalThis.Image = class { constructor() { calls.image++; } };
  globalThis.document = { createElement() { calls.canvas++; throw new Error('Unexpected canvas'); } };
  URL.createObjectURL = () => { calls.url++; throw new Error('Unexpected object URL'); };
  try {
    await assert.rejects(images.createConverterThumbnail(new File([encode('<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.invalid/x"/></svg>')], 'renamed.png', { type: 'image/png' })), /contents|extension|image/i);
    await assert.rejects(images.createConverterThumbnail(new File([pngHeader(6_000, 6_000)], 'huge.png', { type: 'image/png' })), /24|megapixel|resize/i);
    assert.deepEqual(calls, { bitmap: 0, image: 0, url: 0, canvas: 0 });
    delete globalThis.createImageBitmap;
    await assert.rejects(images.createConverterThumbnail(new File([encode('<svg/>')], 'fallback.png')), /contents|extension|image/i);
    assert.deepEqual(calls, { bitmap: 0, image: 0, url: 0, canvas: 0 }, 'Fallback Image path performs the same byte checks');
  } finally {
    if (originals.bitmap === undefined) delete globalThis.createImageBitmap; else globalThis.createImageBitmap = originals.bitmap;
    if (originals.image === undefined) delete globalThis.Image; else globalThis.Image = originals.image;
    if (originals.document === undefined) delete globalThis.document; else globalThis.document = originals.document;
    URL.createObjectURL = originals.url;
  }
});

test('Office image limits detect raster bytes under arbitrary .bin filenames', async () => {
  await assert.rejects(office.inspectOfficeArchive(wordArchive({ 'word/media/disguised.bin': pngHeader(6_000, 6_000) }), 'docx'), /24|megapixel|resize/i);
  const safe = await office.inspectOfficeArchive(wordArchive({ 'word/media/safe.bin': pngHeader(40, 20) }), 'docx');
  assert.equal(safe['word/media/safe.bin'].byteLength, 33);
});

test('embedded SVG is rejected by extension and by content under arbitrary names', async () => {
  const safeSvg = encode('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');
  for (const name of ['word/media/image.SVG', 'word/media/disguised.bin']) {
    await assert.rejects(office.inspectOfficeArchive(wordArchive({ [name]: safeSvg }), 'docx'), /SVG|PNG|JPG/i);
  }
});

test('VML resource styles reject plain, XML-encoded, and CSS-escaped URLs before DOM rendering', async () => {
  const styles = [
    'width:10pt;background-image:url(https://example.invalid/private)',
    'width:10pt;background-image:&#117;&#114;&#108;&#40;https://example.invalid/private&#41;',
    'width:10pt;background-image:&#x75;&#x72;&#x6c;&#x28;https://example.invalid/private&#x29;',
    'width:10pt;background-image:\\75\\72\\6c(https://example.invalid/private)',
    'width:10pt;background-image:u/**/rl(https://example.invalid/private)',
  ];
  for (const style of styles) {
    const vml = encode(`<xml xmlns:v="urn:schemas-microsoft-com:vml"><v:shape style="${style}"/></xml>`);
    await assert.rejects(office.inspectOfficeArchive(wordArchive({ 'word/drawings/vmlDrawing1.vml': vml }), 'docx'), /CSS|resource|style|linked/i);
  }
  const safe = encode('<xml xmlns:v="urn:schemas-microsoft-com:vml"><v:shape style="position:absolute;margin-left:12pt;width:10pt;height:20pt;z-index:1"/></xml>');
  await assert.doesNotReject(office.inspectOfficeArchive(wordArchive({ 'word/drawings/vmlDrawing1.vml': safe }), 'docx'));
});

test('SVG hidden after a long XML comment is rejected regardless of the media filename', async () => {
  const svg = encode(`<?xml version="1.0"?><!--${'safe padding '.repeat(100)}--><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>`);
  assert.ok(svg.byteLength > 1_200);
  await assert.rejects(office.inspectOfficeArchive(wordArchive({ 'word/media/padded.bin': svg }), 'docx'), /SVG|PNG|JPG/i);
});

test('Office content types reject UTF-16 SVG and raster MIME mismatches while accepting declared PNG', async () => {
  const types = mime => encode(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/media/asset.bin" ContentType="${mime}"/></Types>`);
  const utf16Svg = new Uint8Array(Buffer.concat([Buffer.from([255, 254]), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>', 'utf16le')]));
  await assert.rejects(office.inspectOfficeArchive(wordArchive({ '[Content_Types].xml': types('image/svg+xml'), 'word/media/asset.bin': utf16Svg }), 'docx'), /image|type|SVG|support/i);
  await assert.rejects(office.inspectOfficeArchive(wordArchive({ '[Content_Types].xml': types('image&#x2f;svg+xml'), 'word/media/asset.bin': utf16Svg }), 'docx'), /image|type|SVG|support/i);
  const gif = new Uint8Array(11);
  gif.set(encode('GIF89a'));
  new DataView(gif.buffer).setUint16(6, 10, true);
  new DataView(gif.buffer).setUint16(8, 10, true);
  await assert.rejects(office.inspectOfficeArchive(wordArchive({ '[Content_Types].xml': types('image/png'), 'word/media/asset.bin': gif }), 'docx'), /type|match|image/i);
  await assert.doesNotReject(office.inspectOfficeArchive(wordArchive({ '[Content_Types].xml': types('image/png'), 'word/media/asset.bin': pngHeader(10, 10) }), 'docx'));
});

test('ordinary document body text resembling a CSS attribute remains readable', async () => {
  const document = encode('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Example attr=\'url(x)\' in a note</w:t></w:r></w:p></w:body></w:document>');
  const result = await office.inspectOfficeArchive(wordArchive({ 'word/document.xml': document }), 'docx');
  assert.match(new TextDecoder().decode(result['word/document.xml']), /Example attr='url\(x\)' in a note/);
});
