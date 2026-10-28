import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { after } from 'node:test';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import readExcelFile from 'read-excel-file/universal';
import writeExcelFile from 'write-excel-file/universal';
import { createCanvas, DOMMatrix, Image as CanvasImage, ImageData, Path2D } from '@napi-rs/canvas';
import { unzipSync, zipSync } from 'fflate';
import { DOMParser } from '@xmldom/xmldom';

// Exercise the web engine itself with native canvas and PDF parsers. Only the
// browser surface is supplied here; conversion and format libraries stay real.
globalThis.DOMMatrix = DOMMatrix;
globalThis.ImageData = ImageData;
globalThis.Path2D = Path2D;
globalThis.DOMParser = DOMParser;
globalThis.Image = class extends CanvasImage {
  set src(value) { this.sourceUrl = value; }
  async decode() {
    assert.match(this.sourceUrl, /^blob:/, 'Images decode from local file URLs');
    super.src = Buffer.from(await (await fetch(this.sourceUrl)).arrayBuffer());
    await super.decode();
  }
};
const renderedText = [];
globalThis.document = {
  createElement(tag) {
    assert.equal(tag, 'canvas', 'Conversion must not inject page elements');
    const canvas = createCanvas(1, 1);
    const context = canvas.getContext('2d');
    const fillText = context.fillText.bind(context);
    context.fillText = (...args) => { renderedText.push(String(args[0])); return fillText(...args); };
    return canvas;
  },
};
globalThis.window = {
  location: new URL('https://registerbox.in/tools/file-converter'),
  requestAnimationFrame: callback => setTimeout(() => callback(performance.now()), 0),
  cancelAnimationFrame: clearTimeout,
};
globalThis.pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.mjs');

const engineUrl = new URL('../src/lib/file-converter.web.ts', import.meta.url);
// File URLs can represent real ESM cycles. Cache each target before walking its
// imports so lazy OCR -> spreadsheet-reader -> converter imports share one module
// instance instead of recursively constructing ever-larger data URLs.
const moduleDirectory = mkdtempSync(join(tmpdir(), 'registerbox-converter-tests-'));
const moduleUrls = new Map();
after(() => rmSync(moduleDirectory, { recursive: true, force: true }));
function webModuleUrl(sourceUrl) {
  const cached = moduleUrls.get(sourceUrl.href);
  if (cached) return cached;
  const targetUrl = pathToFileURL(join(moduleDirectory, `${moduleUrls.size}.mjs`));
  moduleUrls.set(sourceUrl.href, targetUrl.href);
  const javascript = ts.transpileModule(readFileSync(sourceUrl, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText.replace(/\bimport\.meta\.url\b/g, JSON.stringify(sourceUrl.href)).replace(/((?:from\s*|import\(\s*)['"])([^'"]+)(['"])/g, (_match, prefix, name, suffix) => {
    let target;
    if (name.startsWith('.')) {
      let relativeUrl = new URL(name, sourceUrl);
      if (!existsSync(relativeUrl) && existsSync(`${relativeUrl.pathname}.ts`)) relativeUrl = new URL(`${relativeUrl.href}.ts`);
      target = relativeUrl.pathname.endsWith('.ts') ? webModuleUrl(relativeUrl) : relativeUrl.href;
    } else target = import.meta.resolve(name);
    return `${prefix}${target}${suffix}`;
  });
  const labeled = `${javascript}\n//# sourceURL=${sourceUrl.pathname.replace(/\.ts$/, '.test-harness.js')}\n`;
  writeFileSync(targetUrl, labeled);
  return targetUrl.href;
}
const converter = await import(webModuleUrl(engineUrl));
const officeModule = () => import(webModuleUrl(new URL('../src/lib/office-converter.web.ts', import.meta.url)));

const file = (name, content = 'content', type = '') => new File([content], name, { type });
const sizedFile = (name, size) => file(name, new Uint8Array(size));
const asBytes = async blob => new Uint8Array(await blob.arrayBuffer());
const xmlDocument = bytes => new DOMParser().parseFromString(new TextDecoder().decode(bytes), 'application/xml');

async function textPdf({ pages = 1, width = 595, height = 842 } = {}) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) {
    const page = pdf.addPage([width, height]);
    for (const [text, x, y] of [
      ['Description', 40, height - 60], ['Amount', 320, height - 60],
      [`Office paper ${i + 1}`, 40, height - 90], ['236.00', 320, height - 90],
      ['Stapler', 40, height - 120], ['118.00', 320, height - 120],
    ]) page.drawText(text, { x, y, size: 12, font });
  }
  return pdf.save();
}

function pngBytes(width = 80, height = 40) {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  context.fillStyle = '#f26324';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#14213d';
  context.fillRect(0, 0, Math.floor(width / 2), height);
  return canvas.toBuffer('image/png');
}

async function wordBytes() {
  const { Document, Packer, Paragraph } = await import('docx');
  return new Uint8Array(await Packer.toBuffer(new Document({
    sections: [{ children: [new Paragraph('RegisterBox document'), new Paragraph('Café and தமிழ்'), new Paragraph('Office paper: 236.00')] }],
  })));
}

async function powerpointBytes() {
  const { default: Presentation } = await import('pptxgenjs');
  const presentation = new Presentation();
  presentation.addSlide().addText('RegisterBox first slide', { x: 1, y: 1, w: 6, h: 1 });
  presentation.addSlide().addText('Second slide', { x: 1, y: 1, w: 6, h: 1 });
  return new Uint8Array(await presentation.write({ outputType: 'uint8array' }));
}

function openDocumentBytes(kind) {
  const mime = `application/vnd.oasis.opendocument.${kind === 'odt' ? 'text' : kind === 'ods' ? 'spreadsheet' : 'presentation'}`;
  const body = kind === 'odt' ? '<office:text><text:p>RegisterBox document</text:p><text:p>Office paper: 236.00</text:p></office:text>'
    : kind === 'ods' ? '<office:spreadsheet><table:table table:name="Sales"><table:table-row><table:table-cell office:value-type="string"><text:p>Item</text:p></table:table-cell><table:table-cell office:value-type="string"><text:p>Amount</text:p></table:table-cell></table:table-row><table:table-row><table:table-cell office:value-type="string"><text:p>Paper</text:p></table:table-cell><table:table-cell office:value-type="float" office:value="236"><text:p>236</text:p></table:table-cell></table:table-row></table:table></office:spreadsheet>'
      : '<office:presentation><draw:page draw:name="Slide 1"><draw:frame><draw:text-box><text:p>RegisterBox first slide</text:p></draw:text-box></draw:frame></draw:page><draw:page draw:name="Slide 2"><draw:frame><draw:text-box><text:p>Second slide</text:p></draw:text-box></draw:frame></draw:page></office:presentation>';
  const encode = value => new TextEncoder().encode(value);
  return zipSync({
    mimetype: [encode(mime), { level: 0 }],
    'META-INF/manifest.xml': encode(`<?xml version="1.0"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2"><manifest:file-entry manifest:full-path="/" manifest:media-type="${mime}"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/></manifest:manifest>`),
    'content.xml': encode(`<?xml version="1.0"?><office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" office:version="1.2"><office:body>${body}</office:body></office:document-content>`),
  });
}

test('5 MB is an exact total input limit, including multi-image selections', () => {
  assert.equal(converter.MAX_CONVERSION_BYTES, 5_000_000);
  assert.doesNotThrow(() => converter.validateConversionFiles([sizedFile('report.pdf', 5_000_000)], 'pdf-excel'));
  assert.throws(() => converter.validateConversionFiles([sizedFile('report.pdf', 5_000_001)], 'pdf-excel'), /5\s*MB/i);
  assert.doesNotThrow(() => converter.validateConversionFiles([
    sizedFile('first.png', 2_000_000), sizedFile('second.JPG', 3_000_000),
  ], 'images-pdf'));
  assert.throws(() => converter.validateConversionFiles([
    sizedFile('first.png', 2_000_000), sizedFile('second.jpg', 3_000_001),
  ], 'images-pdf'), /5\s*MB/i);
});

test('selections reject empty, unsupported and excessive inputs before conversion', () => {
  assert.throws(() => converter.validateConversionFiles([], 'images-pdf'), /choose|select|add/i);
  assert.throws(() => converter.validateConversionFiles([file('empty.csv', '')], 'excel-pdf'), /empty|no data/i);
  assert.throws(() => converter.validateConversionFiles([file('legacy.xls')], 'excel-pdf'), /xlsx|csv|support/i);
  assert.throws(() => converter.validateConversionFiles([file('file.docx')], 'pdf-excel'), /pdf/i);
  assert.throws(() => converter.validateConversionFiles([file('a.pdf'), file('b.pdf')], 'pdf-images'), /one|single|1/i);
  assert.doesNotThrow(() => converter.validateConversionFiles(Array.from({ length: 20 }, (_, i) => file(`${i}.webp`)), 'images-pdf'));
  assert.throws(() => converter.validateConversionFiles(Array.from({ length: 21 }, (_, i) => file(`${i}.png`)), 'images-pdf'), /20/i);
});

test('CSV parsing preserves quoted commas, escaped quotes, Unicode, newlines and empty cells', () => {
  assert.deepEqual(converter.parseDelimitedText('\uFEFFName,Note,Amount\r\n"Café, Bengaluru","He said ""yes""",236\r\n"தமிழ்","Line one\nLine two",\r\n'), [
    ['Name', 'Note', 'Amount'],
    ['Café, Bengaluru', 'He said "yes"', '236'],
    ['தமிழ்', 'Line one\nLine two', ''],
  ]);
  assert.deepEqual(converter.parseDelimitedText('Name;Amount\n"Paper, A4";236'), [['Name', 'Amount'], ['Paper, A4', '236']]);
  assert.deepEqual(converter.parseDelimitedText('Name\tAmount\nPaper\t236'), [['Name', 'Amount'], ['Paper', '236']]);
  assert.throws(() => converter.parseDelimitedText('Name,Note\nPaper,"unfinished'), /quot|csv/i);
});

test('CSV resource limits reject excessive rows, columns, cells and cell text', () => {
  const { worksheetRows: rows, worksheetColumns: columns, worksheetCells: cells, cellCharacters: characters } = converter.CONVERSION_LIMITS;
  assert.equal(converter.parseDelimitedText(Array.from({ length: rows }, () => 'a').join('\n')).length, rows);
  assert.throws(() => converter.parseDelimitedText(Array.from({ length: rows + 1 }, () => 'a').join('\n')), /row|large|limit/i);
  assert.throws(() => converter.parseDelimitedText(Array.from({ length: columns + 1 }, () => 'a').join(',')), /column|large|limit/i);
  assert.throws(() => converter.parseDelimitedText(Array.from({ length: Math.ceil(cells / columns) + 1 }, () => Array.from({ length: columns }, () => 'a').join(',')).join('\n')), /cell|large|limit/i);
  assert.throws(() => converter.parseDelimitedText('a'.repeat(characters + 1)), /cell|text|long|limit/i);
});

test('PDF table extraction reconstructs reading order and columns from positioned text', () => {
  const item = (str, x, y, width = 60) => ({ str, transform: [1, 0, 0, 12, x, y], width, height: 12 });
  const items = [
    item('118.00', 320, 680), item('Office paper', 40, 710),
    item('Amount', 320, 740), item(' ', 200, 600),
    item('236.00', 320, 710), item('Description', 40, 740), item('Stapler', 40, 680),
  ];
  assert.deepEqual(converter.extractPdfTableRows(items), [
    ['Description', 'Amount'], ['Office paper', '236.00'], ['Stapler', '118.00'],
  ]);
  assert.deepEqual(converter.extractPdfTableRows([]), []);
});

test('PDF text extraction joins adjacent fragments, aligns missing values and rejects excessive text', () => {
  const item = (str, x, y, width = 30) => ({ str, transform: [1, 0, 0, 12, x, y], width, height: 12 });
  assert.deepEqual(converter.extractPdfTableRows([
    item('Office', 40, 710), item('paper', 76, 711), item('236', 320, 710),
    item('Stapler', 40, 680), item('118', 320, 650),
    item('Invalid coordinates', NaN, 800),
  ]), [['Office paper', '236'], ['Stapler', ''], ['', '118']]);
  assert.throws(() => converter.extractPdfTableRows(Array.from({ length: 20_001 }, () => item('a', 40, 710))), /text|large|limit/i);
  assert.throws(() => converter.extractPdfTableRows(Array.from({ length: 101 }, (_, i) => item('a', i * 100, 710))), /column|complex|limit/i);
});

test('renaming arbitrary bytes does not make a PDF, workbook or image valid', async () => {
  await assert.rejects(converter.convertFiles([file('spoofed.pdf', '<html>not a PDF</html>', 'application/pdf')], 'pdf-excel'), /pdf|read|valid|contents|damaged/i);
  await assert.rejects(converter.convertFiles([file('broken.pdf', '%PDF-1.7\nnot a real document')], 'pdf-images'), /pdf|read|valid|open/i);
  await assert.rejects(converter.convertFiles([file('spoofed.xlsx', 'not a workbook')], 'excel-pdf'), /xlsx|excel|spreadsheet|workbook|valid|contents|damaged/i);
  await assert.rejects(converter.convertFiles([file('spoofed.png', '<svg></svg>', 'image/png')], 'images-pdf'), /image|png|read|valid|contents|damaged/i);
});

test('real PNG inputs become a readable PDF with one page per image in selection order', async () => {
  const progress = [];
  const result = await converter.convertFiles([
    file('landscape.png', pngBytes(80, 40), 'image/png'),
    file('portrait.png', pngBytes(40, 80), 'image/png'),
  ], 'images-pdf', message => progress.push(message));
  assert.equal(result.blob.type, 'application/pdf');
  assert.match(result.filename, /\.pdf$/i);
  assert.ok(result.summary);
  assert.ok(progress.length, 'Users receive progress while work runs');
  const pdf = await PDFDocument.load(await asBytes(result.blob));
  assert.equal(pdf.getPageCount(), 2);
  assert.ok(pdf.getPage(0).getWidth() > pdf.getPage(0).getHeight());
  assert.ok(pdf.getPage(1).getHeight() > pdf.getPage(1).getWidth());
});

test('compressed image headers are checked before enormous rasters can be decoded', async () => {
  const png = new Uint8Array(pngBytes());
  const header = new DataView(png.buffer);
  header.setUint32(16, 5_000);
  header.setUint32(20, 5_000);
  await assert.rejects(converter.convertFiles([file('huge.png', png)], 'images-pdf'), /24|megapixel|resize/i);
});

// Opt in with REGISTERBOX_OCR_NODE_MODULES=/path/to/node_modules containing
// tesseract.js 6.0.1. This keeps a CPU-heavy real OCR acceptance test available
// without adding an OCR dependency to the application or ordinary test install.
test('real printed image becomes an Excel table with all 18 expected cell values', {
  skip: !process.env.REGISTERBOX_OCR_NODE_MODULES,
  timeout: 180_000,
}, async () => {
  const requireOcr = createRequire(join(process.env.REGISTERBOX_OCR_NODE_MODULES, '__test_entry__.cjs'));
  assert.equal(requireOcr('tesseract.js/package.json').version, '6.0.1');
  // Tesseract detects its host when required. Load its Node worker adapter before
  // restoring the canvas-only browser shim used by the production web modules.
  const browserDocument = globalThis.document;
  let createWorker;
  try { delete globalThis.document; ({ createWorker } = requireOcr('tesseract.js')); }
  finally { globalThis.document = browserDocument; }
  const expected = [['Item', 'Quantity', 'Amount'], ['Paper', '3', '150.00'], ['Pen', '12', '240.00'], ['Stapler', '2', '180.00'], ['Book', '5', '500.00'], ['Folder', '8', '320.00']];
  const canvas = createCanvas(1000, 500), context = canvas.getContext('2d');
  const xs = [30, 440, 650, 970], ys = [30, 100, 170, 240, 310, 380, 450];
  context.fillStyle = '#fff'; context.fillRect(0, 0, 1000, 500);
  context.strokeStyle = '#000'; context.lineWidth = 1;
  for (const x of xs) { context.beginPath(); context.moveTo(x, 30); context.lineTo(x, 450); context.stroke(); }
  for (const y of ys) { context.beginPath(); context.moveTo(30, y); context.lineTo(970, y); context.stroke(); }
  context.fillStyle = '#111'; context.font = '26px sans-serif';
  for (let row = 0; row < expected.length; row++) for (let col = 0; col < 3; col++) context.fillText(expected[row][col], xs[col] + 18, ys[row] + 43);
  const previousBitmap = globalThis.createImageBitmap, previousOcr = window.Tesseract;
  globalThis.createImageBitmap = async blob => {
    const image = new CanvasImage(); image.src = Buffer.from(await blob.arrayBuffer()); await image.decode(); image.close = () => {};
    return image;
  };
  window.Tesseract = {
    async createWorker(language, mode, options) {
      assert.equal(language, 'eng'); assert.equal(mode, 1);
      assert.equal(options.workerPath, '/vendor/ca-ocr/worker.min.js');
      assert.equal(options.corePath, '/vendor/ca-ocr');
      assert.equal(options.langPath, '/vendor/ca-ocr');
      // Native canvas is the only bridge: the production recognizer chooses its
      // real parameters and consumes the actual pinned engine's OCR blocks.
      const worker = await createWorker(language, mode, { langPath: new URL('../public/vendor/ca-ocr/', import.meta.url).pathname, cacheMethod: 'none', gzip: true, logger: options.logger });
      return {
        setParameters: parameters => worker.setParameters(parameters),
        recognize: (image, recognizeOptions, output) => worker.recognize(image.toBuffer('image/png'), recognizeOptions, output),
        terminate: () => worker.terminate(),
      };
    },
  };
  try {
    const progress = [];
    const result = await converter.convertFiles([file('clear-table.png', canvas.toBuffer('image/png'), 'image/png')], 'image-excel', message => progress.push(message));
    const sheets = await readExcelFile(result.blob);
    assert.deepEqual(sheets[0].data, expected);
    assert.equal(sheets[1].sheet, 'OCR text');
    assert.deepEqual(result.tablePreview[0].rows, expected);
    assert.equal(result.tablePreview[0].columns, 3);
    assert.equal(result.tablePreview[0].totalRows, 6);
    assert.ok(progress.some(message => /Reading text/.test(message)));
    assert.match(result.filename, /-extracted\.xlsx$/);
  } finally {
    if (previousBitmap === undefined) delete globalThis.createImageBitmap; else globalThis.createImageBitmap = previousBitmap;
    if (previousOcr === undefined) delete window.Tesseract; else window.Tesseract = previousOcr;
    canvas.width = 0; canvas.height = 0;
  }
});

test('CSV with Unicode creates a readable PDF without losing rows to pagination', async () => {
  const rows = ['Name,Amount', 'தமிழ்,236', ...Array.from({ length: 75 }, (_, i) => `Paper ${i + 1},118`)];
  const result = await converter.convertFiles([file('sales.csv', rows.join('\n'), 'text/csv')], 'excel-pdf');
  assert.equal(result.blob.type, 'application/pdf');
  assert.match(result.filename, /\.pdf$/i);
  const pdf = await PDFDocument.load(await asBytes(result.blob));
  assert.ok(pdf.getPageCount() >= 2, 'Rows flow across pages instead of truncating');
});

test('real XLSX data converts to PDF, and a text PDF exports an actual readable XLSX workbook', async () => {
  const workbook = await writeExcelFile([
    [{ value: 'Name' }, { value: 'Amount' }],
    [{ value: 'Paper' }, { type: Number, value: 236 }],
  ]).toBlob();
  const pdfResult = await converter.convertFiles([file('sales.xlsx', workbook)], 'excel-pdf');
  assert.equal((await PDFDocument.load(await asBytes(pdfResult.blob))).getPageCount(), 1);
  const result = await converter.convertFiles([file('invoice.pdf', await textPdf(), 'application/pdf')], 'pdf-excel');
  assert.match(result.filename, /\.xlsx$/i);
  assert.equal(result.blob.type, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  const sheets = await readExcelFile(result.blob);
  assert.ok(sheets.length >= 1);
  assert.deepEqual(sheets[0].data, [
    ['Description', 'Amount'], ['Office paper 1', '236.00'], ['Stapler', '118.00'],
  ]);
});

test('ruled 20-column PDF exports all 20 records to aligned Excel cells with a preview', async () => {
  const pdf = await PDFDocument.create(), font = await pdf.embedFont(StandardFonts.Helvetica), page = pdf.addPage([1600, 900]);
  const xs = Array.from({ length: 21 }, (_, i) => 40 + i * 75), ys = Array.from({ length: 22 }, (_, i) => 850 - i * 35);
  for (const x of xs) page.drawLine({ start: { x, y: ys.at(-1) }, end: { x, y: ys[0] }, thickness: .5 });
  for (const y of ys) page.drawLine({ start: { x: xs[0], y }, end: { x: xs.at(-1), y }, thickness: .5 });
  const expected = [Array.from({ length: 20 }, (_, c) => `Column ${c + 1}`)];
  for (let c = 0; c < 20; c++) page.drawText(expected[0][c], { x: xs[c] + 12, y: ys[0] - 20, size: 9, font });
  for (let r = 1; r <= 20; r++) {
    const row = Array.from({ length: 20 }, (_, c) => c === 0 ? `INV-${String(r).padStart(4, '0')}` : c === 5 && r === 7 ? '' : `${r * 100 + c}.00`);
    expected.push(row);
    for (let c = 0; c < 20; c++) if (row[c]) page.drawText(row[c], { x: xs[c + 1] - 5 - font.widthOfTextAtSize(row[c], 9), y: ys[r] - 20, size: 9, font });
  }
  const result = await converter.convertFiles([file('grid.pdf', await pdf.save(), 'application/pdf')], 'pdf-excel');
  const sheets = await readExcelFile(result.blob);
  assert.deepEqual(sheets[0].data.map(row => row.map(value => value ?? '')), expected);
  assert.equal(result.tablePreview[0].columns, 20);
  assert.equal(result.tablePreview[0].totalRows, 21);
  assert.match(result.summary, /21 rows × 20 columns/);
  assert.ok(result.warnings.some(warning => warning.includes('borders')));
});

// Optional local acceptance check. No user file is added to the repository.
if (process.env.REGISTERBOX_SAMPLE_PDF) test('supplied 20-record PDF survives the actual converter and XLSX reader', async () => {
  const bytes = readFileSync(process.env.REGISTERBOX_SAMPLE_PDF);
  const result = await converter.convertFiles([file('sample.pdf', bytes, 'application/pdf')], 'pdf-excel');
  const sheets = await readExcelFile(result.blob), rows = sheets[0].data;
  assert.equal(rows.length, 21); assert.equal(rows[0].length, 20);
  assert.equal(rows[0][0], 'Invoice ID'); assert.equal(rows[0][19], 'Status');
  for (let r = 1; r <= 20; r++) assert.equal(rows[r][0], `INV-${String(r).padStart(4, '0')}`);
  assert.equal(rows[20][15], '5,361.90'); assert.equal(rows[1][15], '2,301.00');
  if (process.env.REGISTERBOX_SAMPLE_XLSX) writeFileSync(process.env.REGISTERBOX_SAMPLE_XLSX, await asBytes(result.blob));
});

test('workbooks ignore unused ranges, preserve distant real data, and bound filled rows and expanded bytes', async () => {
  const workbook = await writeExcelFile([[{ value: 'Name' }], [{ value: 'Paper' }]]).toBlob();
  const entries = unzipSync(await asBytes(workbook));
  const worksheet = Object.keys(entries).find(name => /^xl\/worksheets\/[^/]+\.xml$/.test(name));
  assert.ok(worksheet);
  const xml = new TextDecoder().decode(entries[worksheet]);
  const withHugeRange = (xml.includes('<dimension')
    ? xml.replace(/<dimension\b[^>]*\/>/, '<dimension ref="A1:XFD1048576"/>')
    : xml.replace('<sheetData>', '<dimension ref="A1:XFD1048576"/><sheetData>'))
    .replace('</sheetData>', '<row r="1048576"><c r="XFD1048576" s="1"/></row></sheetData>');
  assert.notEqual(withHugeRange, xml);
  entries[worksheet] = new TextEncoder().encode(withHugeRange);
  const cleaned = await converter.convertFiles([file('unused-formatting.xlsx', zipSync(entries))], 'excel-pdf');
  assert.equal((await PDFDocument.load(await asBytes(cleaned.blob))).getPageCount(), 1);
  const withDistantData = xml.replace('</sheetData>', '<row r="100000"><c r="A100000" t="inlineStr"><is><t>PreservedSentinelXYZ</t></is></c></row></sheetData>');
  entries[worksheet] = new TextEncoder().encode(withDistantData);
  renderedText.length = 0;
  const distant = await converter.convertFiles([file('distant-data.xlsx', zipSync(entries))], 'excel-pdf');
  assert.equal((await PDFDocument.load(await asBytes(distant.blob))).getPageCount(), 1);
  assert.match(renderedText.join('\n'), /PreservedSentinelXYZ/);
  const denseRows = Array.from({ length: converter.CONVERSION_LIMITS.worksheetRows + 1 }, (_, i) => `<row r="${i + 1}"><c r="A${i + 1}" t="inlineStr"><is><t>Contact ${i + 1}</t></is></c></row>`).join('');
  entries[worksheet] = new TextEncoder().encode(xml.replace(/<sheetData>[\s\S]*<\/sheetData>/, `<sheetData>${denseRows}</sheetData>`));
  await assert.rejects(converter.convertFiles([file('too-many-contacts.xlsx', zipSync(entries))], 'excel-pdf'), /row|large|limit|split/i);
  entries[worksheet] = new TextEncoder().encode(xml);
  entries['docProps/oversized.bin'] = new Uint8Array(converter.CONVERSION_LIMITS.unpackedWorkbookBytes + 1);
  const compressed = zipSync(entries);
  assert.ok(compressed.byteLength < converter.MAX_CONVERSION_BYTES, 'The compressed file passes the upload limit');
  await assert.rejects(converter.convertFiles([file('compressed.xlsx', compressed)], 'excel-pdf'), /expand|compress|safety|limit/i);
});

test('every workbook relationship target is densified before the spreadsheet reader can allocate distant cells', async () => {
  const workbook = await writeExcelFile([[{ value: 'Name' }], [{ value: 'Paper' }]]).toBlob();
  const original = unzipSync(await asBytes(workbook));
  const worksheet = Object.keys(original).find(name => /^xl\/worksheets\/[^/]+\.xml$/.test(name));
  assert.ok(worksheet);
  const sheetXml = new TextDecoder().decode(original[worksheet]);
  const relationships = new TextDecoder().decode(original['xl/_rels/workbook.xml.rels']);
  const relocate = (entries, target) => {
    entries['xl/_rels/workbook.xml.rels'] = new TextEncoder().encode(relationships.replace(/<Relationship\b[^>]*\/>/g, relation => /Type="[^"]*\/worksheet"/.test(relation) ? relation.replace(/Target="[^"]*"/, `Target="${target}"`) : relation));
    delete entries[worksheet];
    return entries;
  };
  for (const [target, path] of [
    ['customsheet.xml', 'xl/customsheet.xml'],
    ['/xl/customsheet.xml', 'xl/customsheet.xml'],
    ['custom&#x73;heet.xml', 'xl/customsheet.xml'],
    ['../customsheet.xml', 'customsheet.xml'],
  ]) {
    const entries = relocate({ ...original }, target);
    entries[path] = new TextEncoder().encode(sheetXml.replace('</sheetData>', '<row r="1048576"><c r="XFD1048576" t="inlineStr"><is><t>CustomTargetSentinel</t></is></c></row></sheetData>'));
    renderedText.length = 0;
    const result = await converter.convertFiles([file('custom-path.xlsx', zipSync(entries))], 'excel-pdf');
    assert.equal((await PDFDocument.load(await asBytes(result.blob))).getPageCount(), 1);
    assert.match(renderedText.join('\n'), /CustomTargetSentinel/, `${target} preserves the real far cell without retaining its huge empty range`);
  }
  const entries = relocate({ ...original }, 'customsheet.xml');
  const rows = Array.from({ length: converter.CONVERSION_LIMITS.worksheetRows + 1 }, (_, index) => `<row r="${index + 1}"><c r="A${index + 1}"><v>${index}</v></c></row>`).join('');
  entries['xl/customsheet.xml'] = new TextEncoder().encode(sheetXml.replace(/<sheetData>[\s\S]*<\/sheetData>/, `<sheetData>${rows}</sheetData>`));
  await assert.rejects(converter.convertFiles([file('custom-many-rows.xlsx', zipSync(entries))], 'excel-pdf'), /10,000|row|split/i);
});

test('workbook XML rejects document types and entities before any XML parser sees them', async () => {
  const workbook = await writeExcelFile([[{ value: 'Name' }]]).toBlob();
  const original = unzipSync(await asBytes(workbook));
  for (const declaration of ['<!DOCTYPE root>', '<!DOCTYPE root [<!ENTITY sample "value">]>']) {
    const entries = { ...original, 'docProps/unreferenced.xml': new TextEncoder().encode(`${declaration}<root/>`) };
    await assert.rejects(converter.convertFiles([file('entity.xlsx', zipSync(entries))], 'excel-pdf'), /XML declarations|document type|entity/i);
  }
});

test('worksheet preflight ignores markup-like XML text and rewrites the actual cell address attribute', async () => {
  const workbook = await writeExcelFile([[{ value: 'Name' }], [{ value: 'Paper' }]]).toBlob();
  const entries = unzipSync(await asBytes(workbook));
  const worksheet = Object.keys(entries).find(name => /^xl\/worksheets\/[^/]+\.xml$/.test(name));
  const xml = new TextDecoder().decode(entries[worksheet]);
  entries[worksheet] = new TextEncoder().encode(xml.replace('</sheetData>', '<row r="1048576"><c note=\' r="A1"\' r="XFD1048576" t="inlineStr"><is><t>ActualAttributeSentinel</t></is></c></row></sheetData>')
    .replace('<sheetData>', '<?example <sheetData></sheetData> ?><extLst><ext><![CDATA[<sheetData></sheetData>]]></ext></extLst><sheetData>'));
  renderedText.length = 0;
  const result = await converter.convertFiles([file('xml-text.xlsx', zipSync(entries))], 'excel-pdf');
  assert.equal((await PDFDocument.load(await asBytes(result.blob))).getPageCount(), 1);
  assert.match(renderedText.join('\n'), /ActualAttributeSentinel/);
});

test('ambiguous worksheet data blocks and duplicate populated cell addresses reject before reading', async () => {
  const workbook = await writeExcelFile([[{ value: 'First' }, { value: 'Second' }]]).toBlob();
  const original = unzipSync(await asBytes(workbook));
  const worksheet = Object.keys(original).find(name => /^xl\/worksheets\/[^/]+\.xml$/.test(name));
  const xml = new TextDecoder().decode(original[worksheet]);
  const normal = await converter.convertFiles([file('normal-two-cells.xlsx', zipSync(original))], 'excel-pdf');
  assert.equal((await PDFDocument.load(await asBytes(normal.blob))).getPageCount(), 1);
  const extraData = xml.replace('</sheetData>', '</sheetData><sheetData><row r="10002"><c r="C10002"><v>7</v></c></row></sheetData>');
  await assert.rejects(converter.convertFiles([file('two-data-blocks.xlsx', zipSync({ ...original, [worksheet]: new TextEncoder().encode(extraData) }))], 'excel-pdf'), /multiple|data sections/i);
  const duplicateCell = xml.replace('</sheetData>', '<row r="1"><c r="A1"><v>7</v></c></row></sheetData>');
  await assert.rejects(converter.convertFiles([file('duplicate-address.xlsx', zipSync({ ...original, [worksheet]: new TextEncoder().encode(duplicateCell) }))], 'excel-pdf'), /duplicate cell/i);
});

test('PDF formulas remain spreadsheet text and do not turn into executable Excel formulas', async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage().drawText('=1+1', { x: 40, y: 700 });
  const result = await converter.convertFiles([file('formula.pdf', await pdf.save())], 'pdf-excel');
  assert.deepEqual((await readExcelFile(result.blob))[0].data, [['=1+1']]);
  for (const [name, bytes] of Object.entries(unzipSync(await asBytes(result.blob)))) {
    if (name.startsWith('xl/worksheets/')) assert.doesNotMatch(new TextDecoder().decode(bytes), /<f(?:\s|>)/);
  }
});

test('PDF image export produces PNG bytes, or a ZIP containing every PDF page', async () => {
  const single = await converter.convertFiles([file('invoice.pdf', await textPdf())], 'pdf-images');
  assert.match(single.filename, /\.png$/i);
  assert.equal(single.blob.type, 'image/png');
  assert.deepEqual(Array.from((await asBytes(single.blob)).subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
  const multi = await converter.convertFiles([file('invoices.pdf', await textPdf({ pages: 2 }))], 'pdf-images');
  assert.match(multi.filename, /\.zip$/i);
  const entries = Object.entries(unzipSync(await asBytes(multi.blob)));
  assert.equal(entries.length, 2);
  for (const [name, bytes] of entries) {
    assert.match(name, /\.png$/i);
    assert.deepEqual(Array.from(bytes.subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
  }
});

test('scanned PDFs explain the text-layer requirement instead of exporting an empty spreadsheet', async () => {
  const pdf = await PDFDocument.create();
  const image = await pdf.embedPng(pngBytes());
  pdf.addPage([595, 842]).drawImage(image, { x: 40, y: 500, width: 400, height: 200 });
  await assert.rejects(converter.convertFiles([file('scan.pdf', await pdf.save())], 'pdf-excel'), /scan|text|OCR/i);
});

test('PDF page and rendered dimension caps prevent tiny files from exhausting browser memory', async () => {
  await assert.rejects(converter.convertFiles([file('many-pages.pdf', await textPdf({ pages: 51 }))], 'pdf-images'), /50|page|limit/i);
  const result = await converter.convertFiles([file('wide-page.pdf', await textPdf({ width: 20_000 }))], 'pdf-images');
  const bytes = await asBytes(result.blob);
  const dimensions = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = dimensions.getUint32(16), height = dimensions.getUint32(20);
  assert.ok(width <= 4_000 && height <= 4_000);
  assert.ok(width * height <= converter.CONVERSION_LIMITS.canvasPixels);
});

test('every added conversion accepts only its selected format and the exact 5 MB limit', () => {
  const inputs = [
    ['word-pdf', 'report.docx'], ['powerpoint-pdf', 'slides.pptx'],
    ['text-pdf', 'notes.txt'], ['opendocument-pdf', 'report.odt'],
    ['pdf-word', 'report.pdf'], ['pdf-powerpoint', 'report.pdf'], ['pdf-text', 'report.pdf'],
  ];
  for (const [mode, name] of inputs) {
    assert.doesNotThrow(() => converter.validateConversionFiles([sizedFile(name, 5_000_000)], mode));
    assert.throws(() => converter.validateConversionFiles([sizedFile(name, 5_000_001)], mode), /5\s*MB/i);
    assert.throws(() => converter.validateConversionFiles([file(name), file(name)], mode), /one|single|1/i);
    assert.throws(() => converter.validateConversionFiles([file('unsupported.exe')], mode), /choose|support|file|format/i);
  }
});

test('PDF to Word creates a real DOCX containing editable text for every page', async () => {
  const result = await converter.convertFiles([file('report.pdf', await textPdf({ pages: 2 }))], 'pdf-word');
  assert.match(result.filename, /\.docx$/i);
  assert.equal(result.blob.type, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  const entries = unzipSync(await asBytes(result.blob));
  assert.ok(entries['[Content_Types].xml']);
  assert.ok(entries['_rels/.rels']);
  const document = xmlDocument(entries['word/document.xml']);
  const paragraphs = Array.from(document.getElementsByTagName('w:p')).map(paragraph => paragraph.textContent);
  assert.ok(paragraphs.includes('Page 1'));
  assert.ok(paragraphs.includes('Page 2'));
  const text = paragraphs.join('\n');
  assert.match(text, /Description/);
  assert.match(text, /Amount/);
  assert.match(text, /Office paper 1/);
  assert.match(text, /Office paper 2/);
  assert.match(text, /236\.00/);
  assert.equal(document.getElementsByTagName('w:drawing').length, 0, 'Word output contains editable text rather than page screenshots');
});

test('PDF to PowerPoint creates one image slide per page with bounded image dimensions', async () => {
  const result = await converter.convertFiles([file('report.pdf', await textPdf({ pages: 2 }))], 'pdf-powerpoint');
  assert.match(result.filename, /\.pptx$/i);
  assert.equal(result.blob.type, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  assert.match((result.warnings ?? []).join(' '), /image|editable|raster/i);
  const entries = unzipSync(await asBytes(result.blob));
  const slides = Object.entries(entries).filter(([name]) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
  const images = Object.entries(entries).filter(([name]) => /^ppt\/media\/.*\.png$/i.test(name));
  assert.equal(slides.length, 2);
  assert.equal(images.length, 2);
  assert.equal(xmlDocument(entries['ppt/presentation.xml']).getElementsByTagName('p:sldId').length, 2);
  for (const [, bytes] of slides) assert.equal(xmlDocument(bytes).getElementsByTagName('p:pic').length, 1);
  for (const [, bytes] of images) {
    assert.deepEqual(Array.from(bytes.subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
    const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    assert.ok(header.getUint32(16) <= 4_000 && header.getUint32(20) <= 4_000);
    assert.ok(header.getUint32(16) * header.getUint32(20) <= converter.CONVERSION_LIMITS.canvasPixels);
  }
});

test('PDF to text preserves selectable rows, columns and explicit page order in UTF-8', async () => {
  const result = await converter.convertFiles([file('report.pdf', await textPdf({ pages: 2 }))], 'pdf-text');
  assert.match(result.filename, /\.txt$/i);
  assert.match(result.blob.type, /^text\/plain/);
  const text = await result.blob.text();
  assert.match(text, /--- Page 1 ---/);
  assert.match(text, /--- Page 2 ---/);
  assert.match(text, /Description\tAmount/);
  assert.match(text, /Office paper 1\t236\.00/);
  assert.ok(text.indexOf('Office paper 1') < text.indexOf('Office paper 2'));
});

test('scanned pages cannot silently become empty Word or text files', async () => {
  const pdf = await PDFDocument.create();
  const image = await pdf.embedPng(pngBytes());
  pdf.addPage().drawImage(image, { x: 40, y: 500, width: 400, height: 200 });
  const scanned = file('scan.pdf', await pdf.save());
  for (const mode of ['pdf-word', 'pdf-text']) await assert.rejects(converter.convertFiles([scanned], mode), /scan|text|OCR/i);
  const partial = await PDFDocument.load(await textPdf());
  const embedded = await partial.embedPng(pngBytes());
  partial.addPage().drawImage(embedded, { x: 40, y: 500, width: 400, height: 200 });
  const result = await converter.convertFiles([file('partial-scan.pdf', await partial.save())], 'pdf-text');
  assert.match(await result.blob.text(), /scan|selectable text|OCR/i);
  assert.match((result.warnings ?? []).join(' '), /2|scan|OCR/i);
});

test('new Office inputs accept current formats and explain excluded legacy binaries', () => {
  for (const name of ['notes.txt', 'readme.md', 'notes.rtf']) assert.doesNotThrow(() => converter.validateConversionFiles([file(name)], 'text-pdf'));
  for (const name of ['report.odt', 'slides.odp', 'sales.ods']) assert.doesNotThrow(() => converter.validateConversionFiles([file(name)], 'opendocument-pdf'));
  assert.throws(() => converter.validateConversionFiles([file('legacy.doc')], 'word-pdf'), /docx|legacy|older/i);
  assert.throws(() => converter.validateConversionFiles([file('legacy.ppt')], 'powerpoint-pdf'), /pptx|legacy|older/i);
});

test('TXT, Markdown and RTF create actual paginated PDF bytes through the public dispatcher', async () => {
  for (const [name, content] of [
    ['notes.txt', ['RegisterBox', 'Café and தமிழ்', ...Array.from({ length: 90 }, (_, i) => `Line ${i + 1}: Office paper 236.00`)].join('\n')],
    ['notes.md', '# RegisterBox\n\nCafé and தமிழ்\n\n- Office paper\n- 236.00'],
    ['notes.rtf', '{\\rtf1\\ansi RegisterBox\\par Caf\\u233? and office paper 236.00}'],
  ]) {
    const result = await converter.convertFiles([file(name, content)], 'text-pdf');
    assert.match(result.filename, /\.pdf$/i);
    assert.equal(result.blob.type, 'application/pdf');
    const pdf = await PDFDocument.load(await asBytes(result.blob));
    assert.ok(pdf.getPageCount() >= (name.endsWith('.txt') ? 2 : 1));
  }
});

test('RTF text extraction preserves Unicode and line breaks while omitting hidden metadata', async () => {
  const office = await officeModule();
  const text = office.parseRtfText('{\\rtf1\\ansi Report\\par Caf\\u233? \\b bold\\b0 {\\*\\generator hidden metadata;}end}');
  assert.match(text, /Report\s*\n/);
  assert.match(text, /Café/);
  assert.match(text, /bold/);
  assert.match(text, /end/);
  assert.doesNotMatch(text, /generator|hidden metadata|rtf1|\\b/);
  assert.match(office.parseRtfText('{\\rtf1\\ansi\\uc1 Smile \\u-10179?\\u-8704?}'), /😀/);
});

test('real Word and PowerPoint files pass archive inspection with their content intact', async () => {
  const office = await officeModule();
  const word = await office.inspectOfficeArchive(await wordBytes(), 'docx');
  const text = xmlDocument(word['word/document.xml']).documentElement.textContent;
  assert.match(text, /RegisterBox document/);
  assert.match(text, /Café and தமிழ்/);
  const presentation = await office.inspectOfficeArchive(await powerpointBytes(), 'pptx');
  const slides = Object.keys(presentation).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name));
  assert.equal(slides.length, 2);
  assert.match(xmlDocument(presentation['ppt/slides/slide1.xml']).documentElement.textContent, /RegisterBox first slide/);
});

test('OpenDocument text, presentation and spreadsheet packages retain their content after safe inspection', async () => {
  const office = await officeModule();
  for (const kind of ['odt', 'odp', 'ods']) {
    const entries = await office.inspectOfficeArchive(openDocumentBytes(kind), kind);
    const content = xmlDocument(entries['content.xml']);
    assert.ok(content.getElementsByTagName('office:body').length);
    assert.match(content.documentElement.textContent, kind === 'ods' ? /Paper/ : /RegisterBox/);
  }
});

test('Office inspection rejects malformed, active, external and excessively compressed packages', async () => {
  const office = await officeModule();
  await assert.rejects(office.inspectOfficeArchive(new TextEncoder().encode('not a DOCX'), 'docx'), /zip|docx|file|format|valid/i);
  const clean = unzipSync(await wordBytes());
  await assert.rejects(office.inspectOfficeArchive(zipSync({ ...clean, 'word/vbaProject.bin': new Uint8Array([1, 2, 3]) }), 'docx'), /macro|active|embedded|support|unsafe/i);
  const dtd = new TextEncoder().encode('<?xml version="1.0"?><!DOCTYPE x [<!ENTITY leak SYSTEM "https://example.invalid/private">]><x>&leak;</x>');
  await assert.rejects(office.inspectOfficeArchive(zipSync({ ...clean, 'word/document.xml': dtd }), 'docx'), /DTD|entity|unsafe|support|XML/i);
  const externalImage = new TextEncoder().encode('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdRemote" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="https://example.invalid/image.png" TargetMode="External"/></Relationships>');
  await assert.rejects(office.inspectOfficeArchive(zipSync({ ...clean, 'word/_rels/document.xml.rels': externalImage }), 'docx'), /external|remote|unsafe|support|resource/i);
  const compressed = zipSync({ ...clean, 'word/large-data.bin': new Uint8Array(24_000_001) });
  assert.ok(compressed.byteLength < converter.MAX_CONVERSION_BYTES);
  await assert.rejects(office.inspectOfficeArchive(compressed, 'docx'), /expand|compress|limit|large/i);
});

test('Office archives bound aggregate raster pixels across PNG, JPEG, GIF and WebP before decoding', async () => {
  const office = await officeModule();
  const clean = unzipSync(await wordBytes());
  // Every header declares 13 MP, below the individual 24 MP limit. The archive
  // must fail at 52 MP even though its compressed bytes and each image are small.
  const width = 4_000, height = 3_250;
  const png = new Uint8Array(pngBytes());
  new DataView(png.buffer).setUint32(16, width);
  new DataView(png.buffer).setUint32(20, height);
  const jpeg = new Uint8Array(32);
  jpeg.set([255, 216, 255, 192, 0, 17, 8]);
  new DataView(jpeg.buffer).setUint16(7, height);
  new DataView(jpeg.buffer).setUint16(9, width);
  const gif = new Uint8Array(11);
  gif.set(new TextEncoder().encode('GIF89a'));
  new DataView(gif.buffer).setUint16(6, width, true);
  new DataView(gif.buffer).setUint16(8, height, true);
  const webp = new Uint8Array(30);
  webp.set(new TextEncoder().encode('RIFF'), 0);
  webp.set(new TextEncoder().encode('WEBPVP8X'), 8);
  new DataView(webp.buffer).setUint32(4, 22, true);
  new DataView(webp.buffer).setUint32(16, 10, true);
  for (let i = 0; i < 3; i++) {
    webp[24 + i] = ((width - 1) >> (i * 8)) & 255;
    webp[27 + i] = ((height - 1) >> (i * 8)) & 255;
  }
  const underLimit = { ...clean, 'word/media/first.png': png, 'word/media/second.jpg': jpeg, 'word/media/third.gif': gif };
  await assert.doesNotReject(office.inspectOfficeArchive(zipSync(underLimit), 'docx'));
  await assert.rejects(office.inspectOfficeArchive(zipSync({ ...underLimit, 'word/media/fourth.webp': webp }), 'docx'), /48.*megapixels|megapixels.*total/i);
});
