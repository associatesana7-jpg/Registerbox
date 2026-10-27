/** Local-only conversion. File contents never leave the browser. */
export const MAX_CONVERSION_BYTES = 5_000_000;

export const CONVERSION_LIMITS = {
  imageFiles: 20,
  pdfPages: 50,
  worksheetCount: 15,
  worksheetRows: 10_000,
  worksheetColumns: 100,
  worksheetCells: 100_000,
  pdfTextCells: 20_000,
  pdfTextRows: 5_000,
  cellCharacters: 10_000,
  spreadsheetPdfPages: 300,
  unpackedWorkbookBytes: 48_000_000,
  inputImagePixels: 24_000_000,
  combinedImagePixels: 24_000_000,
  canvasPixels: 8_000_000,
  outputBytes: 100_000_000,
  extractedTextCharacters: 2_000_000,
  extractedTextRows: 20_000,
} as const;

export type OfficeConversionMode = 'word-pdf' | 'powerpoint-pdf' | 'text-pdf' | 'opendocument-pdf';
export type ConversionMode = 'images-pdf' | 'excel-pdf' | 'pdf-images' | 'pdf-excel' | OfficeConversionMode | 'pdf-word' | 'pdf-powerpoint' | 'pdf-text';
export type ConversionResult = {
  blob: Blob;
  filename: string;
  summary: string;
  warnings?: string[];
};
type Progress = (message: string) => void;
type Table = { name: string; rows: string[][] };
export type PdfTextChunk = {
  str: string;
  transform: readonly number[];
  width: number;
  height: number;
  hasEOL?: boolean;
};

function extension(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

function outputName(name: string, suffix: string) {
  const stem = name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').slice(0, 100);
  return `${stem || 'converted'}${suffix}`;
}

export function validateConversionFiles(files: readonly File[], mode: ConversionMode): void {
  if (!['images-pdf', 'excel-pdf', 'pdf-images', 'pdf-excel', 'word-pdf', 'powerpoint-pdf', 'text-pdf', 'opendocument-pdf', 'pdf-word', 'pdf-powerpoint', 'pdf-text'].includes(mode)) {
    throw new Error('Choose a supported conversion.');
  }
  if (!files.length) throw new Error('Add a file to convert.');
  if (mode !== 'images-pdf' && files.length !== 1) throw new Error('Choose one file for this conversion.');
  if (files.length > CONVERSION_LIMITS.imageFiles) throw new Error('Choose up to 20 images at a time.');
  const allowed = mode === 'images-pdf' ? ['png', 'jpg', 'jpeg', 'webp']
    : mode === 'excel-pdf' ? ['xlsx', 'csv']
    : mode === 'word-pdf' ? ['docx']
    : mode === 'powerpoint-pdf' ? ['pptx']
    : mode === 'text-pdf' ? ['txt', 'md', 'rtf']
    : mode === 'opendocument-pdf' ? ['odt', 'odp', 'ods'] : ['pdf'];
  let total = 0;
  for (const file of files) {
    if (!Number.isFinite(file.size) || file.size <= 0) throw new Error(`${file.name || 'This file'} is empty.`);
    if (!allowed.includes(extension(file.name))) {
      const message = mode === 'excel-pdf' ? 'Choose an .xlsx or .csv file. Older .xls files must first be saved as .xlsx.'
        : mode === 'word-pdf' ? 'Choose a .docx file. Older .doc files must first be saved as .docx.'
        : mode === 'powerpoint-pdf' ? 'Choose a .pptx file. Older .ppt files must first be saved as .pptx.'
        : mode === 'text-pdf' ? 'Choose a .txt, .md or .rtf file.'
        : mode === 'opendocument-pdf' ? 'Choose an .odt, .odp or .ods OpenDocument file.'
        : `Choose ${mode === 'images-pdf' ? 'PNG, JPG or WebP images' : 'a PDF file'}.`;
      throw new Error(message);
    }
    total += file.size;
  }
  if (total > MAX_CONVERSION_BYTES) throw new Error('Files must total 5 MB or less (5,000,000 bytes).');
}

function checkTableSize(rows: readonly (readonly unknown[])[]) {
  if (rows.length > CONVERSION_LIMITS.worksheetRows) throw new Error('This spreadsheet contains over 10,000 rows with data. Split it into smaller files.');
  let cells = 0;
  for (const row of rows) {
    if (row.length > CONVERSION_LIMITS.worksheetColumns) throw new Error('A sheet can contain up to 100 columns. Split this spreadsheet into smaller files.');
    cells += row.filter((cell) => String(cell ?? '').trim()).length;
    if (cells > CONVERSION_LIMITS.worksheetCells) throw new Error('This spreadsheet contains over 100,000 filled cells. Split it into smaller files.');
    for (const cell of row) {
      if (String(cell ?? '').length > CONVERSION_LIMITS.cellCharacters) throw new Error('A cell contains over 10,000 characters. Shorten that cell before converting.');
    }
  }
}

function compactTable(rows: string[][]) {
  const populated = rows.filter((row) => row.some((cell) => cell.trim()));
  const columns = new Set<number>();
  for (const row of populated) row.forEach((cell, column) => { if (cell.trim()) columns.add(column); });
  const ordered = [...columns].sort((a, b) => a - b);
  return populated.map((row) => ordered.map((column) => row[column] ?? ''));
}

/** RFC-style quoted CSV, also accepting Excel's tab-separated clipboard text. */
export function parseDelimitedText(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, '');
  if (text.includes('\u0000')) throw new Error('This is not a readable CSV file. Save it as UTF-8 CSV and try again.');
  const counts = { ',': 0, '\t': 0, ';': 0 };
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') index++;
      else quoted = !quoted;
    } else if (!quoted && (char === '\n' || char === '\r')) break;
    else if (!quoted && char in counts) counts[char as keyof typeof counts]++;
  }
  const delimiter = (Object.keys(counts) as (keyof typeof counts)[]).sort((a, b) => counts[b] - counts[a])[0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let afterQuote = false;
  let count = 0;
  const finishCell = () => {
    row.push(cell);
    cell = '';
    afterQuote = false;
    if (row[row.length - 1].trim()) count++;
    if (row.length > CONVERSION_LIMITS.worksheetColumns || count > CONVERSION_LIMITS.worksheetCells) {
      throw new Error('This conversion supports up to 100 columns and 100,000 filled cells. Split this spreadsheet into smaller files.');
    }
  };
  const finishRow = () => {
    finishCell();
    if (row.some((value) => value.trim())) rows.push(row);
    row = [];
    if (rows.length > CONVERSION_LIMITS.worksheetRows) throw new Error('This spreadsheet contains over 10,000 rows with data. Split it into smaller files.');
  };
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index++; }
      else if (char === '"') { inQuotes = false; afterQuote = true; }
      else cell += char;
    } else if (char === delimiter) finishCell();
    else if (char === '\r' || char === '\n') {
      if (char === '\r' && text[index + 1] === '\n') index++;
      finishRow();
    } else if (char === '"' && cell === '' && !afterQuote) inQuotes = true;
    else {
      if (afterQuote && char.trim()) throw new Error('The CSV has text after a closing quote. Check the file and try again.');
      if (!afterQuote) cell += char;
    }
    if (cell.length > CONVERSION_LIMITS.cellCharacters) throw new Error('A cell contains over 10,000 characters. Shorten that cell before converting.');
  }
  if (inQuotes) throw new Error('The CSV has an unclosed quoted cell. Check the file and try again.');
  if (cell.length || row.length || afterQuote) finishRow();
  if (!rows.some((item) => item.some((value) => value.trim()))) throw new Error('The spreadsheet contains no data to convert.');
  return rows;
}

function assertMagic(bytes: Uint8Array, kind: 'pdf' | 'xlsx' | 'png' | 'jpeg' | 'webp') {
  const starts = (...values: number[]) => values.every((value, index) => bytes[index] === value);
  const matches = kind === 'pdf' ? new TextDecoder().decode(bytes.subarray(0, 1024)).includes('%PDF-')
    : kind === 'xlsx' ? starts(0x50, 0x4b, 0x03, 0x04)
    : kind === 'png' ? starts(137, 80, 78, 71, 13, 10, 26, 10)
    : kind === 'jpeg' ? starts(0xff, 0xd8, 0xff)
    : starts(82, 73, 70, 70) && new TextDecoder().decode(bytes.subarray(8, 12)) === 'WEBP';
  if (!matches) throw new Error('The file contents do not match its extension, or the file is damaged. Choose the original file and try again.');
}

function browserCanvas(width: number, height: number) {
  if (typeof document === 'undefined') throw new Error('Open this converter in a web browser.');
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width);
  canvas.height = Math.ceil(height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser could not create an image. Try another browser or a smaller file.');
  return { canvas, context };
}

function releaseCanvas(canvas: HTMLCanvasElement) { canvas.width = 0; canvas.height = 0; }
function yieldToBrowser() { return new Promise<void>((resolve) => setTimeout(resolve, 0)); }
function canvasBlob(canvas: HTMLCanvasElement, type = 'image/png') {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The browser could not encode this image. Try a smaller file.')), type, 0.94));
}
function safeOutput(blob: Blob) {
  if (!blob.size || blob.size > CONVERSION_LIMITS.outputBytes) throw new Error('The converted result is too large for this browser tool. Try fewer pages or smaller images.');
  return blob;
}

/** Read dimensions before decoding to reject compressed images with huge rasters. */
function imageDimensions(bytes: Uint8Array, kind: 'png' | 'jpeg' | 'webp'): [number, number] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  try {
    if (kind === 'png') return [view.getUint32(16), view.getUint32(20)];
    if (kind === 'jpeg') {
      let offset = 2;
      while (offset < bytes.length - 9) {
        if (bytes[offset++] !== 0xff) continue;
        while (bytes[offset] === 0xff) offset++;
        const marker = bytes[offset++];
        if (marker === 0xd9 || marker === 0xda) break;
        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
        const size = view.getUint16(offset);
        if (size < 2) break;
        if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) return [view.getUint16(offset + 5), view.getUint16(offset + 3)];
        offset += size;
      }
    } else if (kind === 'webp') {
      const chunk = new TextDecoder().decode(bytes.subarray(12, 16));
      if (chunk === 'VP8X') return [1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16)];
      if (chunk === 'VP8 ') return [view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff];
      if (chunk === 'VP8L' && bytes[20] === 0x2f) return [1 + bytes[21] + ((bytes[22] & 0x3f) << 8), 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10)];
    }
  } catch { /* The validation below handles truncated image headers. */ }
  throw new Error('This image is damaged or uses an unsupported encoding. Save it as a new PNG or JPG and try again.');
}

function checkImageSize(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new Error('This image has invalid dimensions.');
  if (width > 20_000 || height > 20_000 || width * height > CONVERSION_LIMITS.inputImagePixels) {
    throw new Error('An image is larger than 24 megapixels or 20,000 pixels on one side. Resize it before converting.');
  }
}

async function imagesToPdf(files: readonly File[], progress: Progress): Promise<ConversionResult> {
  let sourcePixels = 0;
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = extension(file.name) === 'png' ? 'png' : extension(file.name) === 'webp' ? 'webp' : 'jpeg';
    assertMagic(bytes, kind);
    const [width, height] = imageDimensions(bytes, kind);
    checkImageSize(width, height);
    sourcePixels += width * height;
  }
  const combinedScale = Math.min(1, Math.sqrt(CONVERSION_LIMITS.combinedImagePixels / sourcePixels));
  const { PDFDocument } = await import('pdf-lib/dist/pdf-lib.esm.js');
  const pdf = await PDFDocument.create();
  let resized = false;
  let encodedBytes = 0;
  for (let index = 0; index < files.length; index++) {
    progress(`Adding image ${index + 1} of ${files.length}…`);
    const file = files[index];
    const kind = extension(file.name) === 'png' ? 'png' : extension(file.name) === 'webp' ? 'webp' : 'jpeg';
    if (typeof Image === 'undefined') throw new Error('Open this converter in a web browser.');
    const url = URL.createObjectURL(file);
    let canvas: HTMLCanvasElement | undefined;
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      checkImageSize(image.naturalWidth, image.naturalHeight);
      const scale = Math.min(combinedScale, Math.sqrt(CONVERSION_LIMITS.canvasPixels / (image.naturalWidth * image.naturalHeight)));
      resized ||= scale < 1;
      const surface = browserCanvas(image.naturalWidth * scale, image.naturalHeight * scale);
      canvas = surface.canvas;
      surface.context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const encoded = new Uint8Array(await (await canvasBlob(canvas, kind === 'jpeg' ? 'image/jpeg' : 'image/png')).arrayBuffer());
      encodedBytes += encoded.length;
      if (encodedBytes > CONVERSION_LIMITS.outputBytes) throw new Error('The converted images exceed the browser output limit. Try fewer images.');
      const embedded = kind === 'jpeg' ? await pdf.embedJpg(encoded) : await pdf.embedPng(encoded);
      const landscape = canvas.width > canvas.height;
      const page = pdf.addPage(landscape ? [841.89, 595.28] : [595.28, 841.89]);
      const fit = Math.min((page.getWidth() - 40) / canvas.width, (page.getHeight() - 40) / canvas.height);
      const width = canvas.width * fit;
      const height = canvas.height * fit;
      page.drawImage(embedded, { x: (page.getWidth() - width) / 2, y: (page.getHeight() - height) / 2, width, height });
      // Flush each raster now so pdf-lib can release its decoded RGB channels
      // instead of retaining every page's pixels until the final save.
      await embedded.embed();
    } catch (error) {
      throw new Error(`Could not convert ${file.name}. ${error instanceof Error ? error.message : 'Choose an undamaged PNG, JPG or WebP image.'}`);
    } finally {
      URL.revokeObjectURL(url);
      if (canvas) releaseCanvas(canvas);
    }
    await yieldToBrowser();
  }
  const bytes = await pdf.save();
  return {
    blob: safeOutput(new Blob([bytes as BlobPart], { type: 'application/pdf' })),
    filename: files.length === 1 ? outputName(files[0].name, '.pdf') : 'combined-images.pdf',
    summary: `${files.length} image${files.length === 1 ? '' : 's'} converted to ${files.length} PDF page${files.length === 1 ? '' : 's'}.`,
    warnings: resized ? ['Large images were resized to keep browser memory use manageable.'] : undefined,
  };
}

async function readWorkbook(file: File): Promise<Table[]> {
  if (extension(file.name) === 'csv') {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let text: string;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch { throw new Error('Save this CSV as UTF-8 and try again.'); }
    return [{ name: outputName(file.name, ''), rows: compactTable(parseDelimitedText(text)) }];
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  assertMagic(bytes, 'xlsx');
  const { zipSync } = await import('fflate');
  const { unzipConverterArchive } = await import('./converter-archive');
  let sheets = 0;
  let cells = 0;
  const unpacked = await unzipConverterArchive(bytes, {
    maxUncompressedBytes: CONVERSION_LIMITS.unpackedWorkbookBytes,
    filter: (entry) => /\.(?:xml|rels)$/i.test(entry.name),
  });
  if (!unpacked['xl/workbook.xml']) throw new Error('This is not a readable XLSX workbook. Save the file as .xlsx and try again.');
  const xmlFiles = new Map<string, string>();
  for (const [name, data] of Object.entries(unpacked)) {
    let xml: string;
    try { xml = new TextDecoder('utf-8', { fatal: true }).decode(data); }
    catch { throw new Error('This workbook contains unsupported XML text. Save a fresh .xlsx copy and try again.'); }
    if (xml.includes('\u0000') || /<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml)) throw new Error('This workbook contains unsupported XML declarations. Save a standard .xlsx copy without document type or entity declarations.');
    xmlFiles.set(name, xml);
  }
  const relationsXml = xmlFiles.get('xl/_rels/workbook.xml.rels');
  if (!relationsXml) throw new Error('This workbook is missing its worksheet relationships. Save a fresh .xlsx copy and try again.');
  const { XMLParser, XMLValidator } = await import('fast-xml-parser');
  if (XMLValidator.validate(relationsXml) !== true) throw new Error('This workbook has unreadable worksheet relationships. Save a fresh copy and try again.');
  const decodeAttribute = (value: string) => value.replace(/&([^;]*);/g, (_entity, reference: string) => {
    const named: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' };
    if (Object.hasOwn(named, reference)) return named[reference];
    const numeric = reference.match(/^#(?:x([a-f\d]+)|(\d+))$/i);
    const point = numeric ? Number.parseInt(numeric[1] ?? numeric[2], numeric[1] ? 16 : 10) : NaN;
    if (!Number.isSafeInteger(point) || point > 0x10ffff || (point < 0x20 && ![9, 10, 13].includes(point)) || (point >= 0xd800 && point <= 0xdfff) || point === 0xfffe || point === 0xffff) throw new Error('This workbook contains an invalid XML attribute entity. Save a fresh .xlsx copy and try again.');
    return String.fromCodePoint(point);
  });
  // Decode XML attributes exactly once, including numeric references. FXP's
  // default XML mode intentionally leaves some numeric entities unchanged.
  const parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', removeNSPrefix: true, parseAttributeValue: false, parseTagValue: false, trimValues: false, processEntities: false, attributeValueProcessor: (_name, value) => typeof value === 'string' ? decodeAttribute(value) : value }).parse(relationsXml);
  const relationships = parsed?.Relationships?.Relationship;
  const sheetPaths = new Set<string>();
  const relationshipIds = new Set<string>();
  const safeRelationships: string[] = [];
  const relationshipBases = ['http://schemas.openxmlformats.org/officeDocument/2006/relationships/', 'http://purl.oclc.org/ooxml/officeDocument/relationships/'];
  const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  for (const relation of relationships === undefined ? [] : Array.isArray(relationships) ? relationships : [relationships]) {
    const type = relation?.['@_Type'];
    const kind = typeof type === 'string' ? relationshipBases.map((base) => type.startsWith(base) ? type.slice(base.length) : '').find(Boolean) : undefined;
    if (!kind || !['worksheet', 'styles', 'sharedStrings'].includes(kind)) continue;
    const id = relation?.['@_Id'];
    const target = relation?.['@_Target'];
    if (typeof id !== 'string' || !id || relationshipIds.has(id) || typeof target !== 'string' || !target || relation['@_TargetMode'] === 'External'
      || target !== target.trim() || /[\\\u0000-\u001f?#]/.test(target) || /^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith('//')) {
      throw new Error('This workbook has an unsafe or ambiguous worksheet relationship. Save a fresh .xlsx copy and try again.');
    }
    relationshipIds.add(id);
    const components: string[] = target.startsWith('/') ? [] : ['xl'];
    for (const component of target.split('/')) {
      if (!component || component === '.') continue;
      if (component === '..') {
        if (!components.length) throw new Error('This workbook has an invalid worksheet path. Save a fresh copy and try again.');
        components.pop();
      } else components.push(component);
    }
    const name = components.join('/').normalize('NFC');
    if (!name || !xmlFiles.has(name)) throw new Error('This workbook references a missing worksheet or data file. Save a fresh .xlsx copy and try again.');
    if (kind === 'worksheet') sheetPaths.add(name);
    // Feed the reader only canonical targets we resolve and inspect ourselves.
    // Its own target resolver merely prefixes xl/ and does not normalize paths.
    safeRelationships.push(`<Relationship Id="${escapeXml(id)}" Type="${escapeXml(type)}" Target="/${escapeXml(name)}"/>`);
  }
  if (!sheetPaths.size) throw new Error('This workbook contains no readable worksheets. Save a fresh .xlsx copy and try again.');
  unpacked['xl/_rels/workbook.xml.rels'] = new TextEncoder().encode(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${safeRelationships.join('')}</Relationships>`);
  for (const name of sheetPaths) {
    sheets++;
    if (sheets > CONVERSION_LIMITS.worksheetCount) throw new Error('This conversion supports up to 15 sheets. Split this workbook into smaller files.');
    const rawXml = xmlFiles.get(name)!;
    if (XMLValidator.validate(rawXml) !== true) throw new Error('This workbook has an unreadable worksheet. Save a fresh .xlsx copy and try again.');
    // Normalize non-element XML text before scanning cells. Markup-like text
    // in CDATA, comments or processing instructions must never hide a real
    // sheetData element from the preflight the reader relies on.
    const xml = rawXml.replace(/<!--[\s\S]*?-->/g, '').replace(/<\?[\s\S]*?\?>/g, '')
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_all, text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
    const dataElements = [...xml.matchAll(/<(?:[^\s<>/:]+:)?sheetData\b(?:[^>"'/]|"[^"]*"|'[^']*')*\/?\s*>/gi)];
    if (dataElements.length !== 1) throw new Error('This workbook has multiple or missing worksheet data sections. Save a fresh .xlsx copy and try again.');
    const sourceData = xml.match(/<((?:[\w.-]+:)?sheetData)\b(?:[^>"'/]|"[^"]*"|'[^']*')*(?:\/>|>[\s\S]*?<\/\1\s*>)/i);
    if (!sourceData) throw new Error('This workbook has an unreadable worksheet. Save a fresh .xlsx copy and try again.');
    const filledRows = new Map<number, Map<number, string>>();
    const filledColumns = new Set<number>();
    for (const match of sourceData[0].matchAll(/<((?:[\w.-]+:)?c)\b((?:[^>"'/]|"[^"]*"|'[^']*')*)(\/>|>[\s\S]*?<\/(?:[\w.-]+:)?c\s*>)/gi)) {
      const attributes = new Map([...match[2].matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((attribute) => [attribute[1], decodeAttribute(attribute[2] ?? attribute[3])]));
      const closing = match[3].startsWith('/') ? '/>' : match[3];
      const address = attributes.get('r');
      const safeAttributes = ['r', 's', 't'].filter((attribute) => attributes.has(attribute)).map((attribute) => ` ${attribute}="${escapeXml(attributes.get(attribute)!)}"`).join('');
      const cell = `<${match[1]}${safeAttributes}${closing}`;
      // Styling-only cells and huge declared ranges are common in ordinary
      // workbooks. Only cells with a value, inline text or formula are data.
      const value = cell.match(/<(?:[\w.-]+:)?v\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?v\s*>/i)?.[1];
      const text = [...cell.matchAll(/<(?:[\w.-]+:)?t\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?t\s*>/gi)].map((item) => item[1]).join('');
      const formula = /<(?:[\w.-]+:)?f\b/i.test(cell);
      if (!value?.trim() && !text.trim() && !formula) continue;
      const reference = address?.match(/^([A-Z]+)(\d+)$/i);
      if (!reference) throw new Error('This workbook has a cell without a valid address. Save a fresh .xlsx copy and try again.');
      let column = 0;
      for (const char of reference[1].toUpperCase()) column = column * 26 + char.charCodeAt(0) - 64;
      const row = Number(reference[2]);
      if (!Number.isSafeInteger(column) || column < 1 || column > 16_384 || !Number.isSafeInteger(row) || row < 1 || row > 1_048_576) throw new Error('This workbook contains an invalid Excel cell address. Save a fresh copy and try again.');
      if (!filledRows.has(row)) filledRows.set(row, new Map());
      if (filledRows.get(row)!.has(column)) throw new Error('This workbook contains duplicate cell addresses. Save a fresh .xlsx copy and try again.');
      filledRows.get(row)!.set(column, cell);
      filledColumns.add(column);
      cells++;
      if (filledRows.size > CONVERSION_LIMITS.worksheetRows) throw new Error('This spreadsheet contains over 10,000 rows with data. Split it into smaller files.');
      if (filledColumns.size > CONVERSION_LIMITS.worksheetColumns) throw new Error('This spreadsheet contains over 100 columns with data. Split it into smaller files.');
      if (cells > CONVERSION_LIMITS.worksheetCells) throw new Error('This workbook contains over 100,000 filled cells. Split it into smaller files.');
    }
    const columns = [...filledColumns].sort((a, b) => a - b);
    const denseColumns = new Map(columns.map((column, index) => [column, index + 1]));
    const columnName = (column: number) => {
      let result = '';
      while (column > 0) { column--; result = String.fromCharCode(65 + column % 26) + result; column = Math.floor(column / 26); }
      return result;
    };
    const prefix = sourceData[1].slice(0, -'sheetData'.length);
    const rowsXml = [...filledRows].sort(([a], [b]) => a - b).map(([, row], index) => {
      const content = [...row].sort(([a], [b]) => a - b).map(([column, cell]) => cell.replace(/(\s+r\s*=\s*)(["'])[A-Z]+\d+\2/i, (_all, before, quote) => `${before}${quote}${columnName(denseColumns.get(column)!)}${index + 1}${quote}`)).join('');
      return `<${prefix}row r="${index + 1}">${content}</${prefix}row>`;
    }).join('');
    // Rewrite dense addresses before the reader allocates row/column arrays.
    // No populated cell is dropped; blank rows and columns are omitted.
    const sanitized = xml.replace(sourceData[0], `<${sourceData[1]}>${rowsXml}</${sourceData[1]}>`)
      .replace(/<(?:[\w-]+:)?dimension\b[^>]*(?:\/>|>[\s\S]*?<\/(?:[\w-]+:)?dimension\s*>)/gi, '')
      .replace(/<(?:[\w-]+:)?mergeCells\b[^>]*(?:\/>|>[\s\S]*?<\/(?:[\w-]+:)?mergeCells\s*>)/gi, '');
    unpacked[name] = new TextEncoder().encode(sanitized);
  }
  const { default: readExcelFile } = await import('read-excel-file/browser');
  const sanitizedFile = new Blob([zipSync(unpacked, { level: 1 }) as BlobPart], { type: file.type });
  const workbook = await readExcelFile(sanitizedFile);
  let totalCells = 0;
  return workbook.map((sheet) => {
    checkTableSize(sheet.data);
    totalCells += sheet.data.reduce((sum, row) => sum + row.filter((cell) => String(cell ?? '').trim()).length, 0);
    if (totalCells > CONVERSION_LIMITS.worksheetCells) throw new Error('This workbook contains over 100,000 filled cells. Split it into smaller files.');
    return {
      name: sheet.sheet,
      rows: compactTable(sheet.data.map((row) => row.map((value) => value instanceof Date ? value.toISOString().replace(/T00:00:00\.000Z$/, '') : String(value ?? '')))),
    };
  });
}

let textSegmenter: Intl.Segmenter | undefined;
function graphemes(text: string) {
  if (typeof Intl.Segmenter !== 'function') return Array.from(text);
  textSegmenter ??= new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  return Array.from(textSegmenter.segment(text), (part) => part.segment);
}

function wrapCell(context: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    let line = '';
    for (const character of graphemes(paragraph)) {
      if (line && context.measureText(line + character).width > width) { lines.push(line); line = character; }
      else line += character;
    }
    lines.push(line);
  }
  return lines;
}

async function workbookToPdf(file: File, progress: Progress): Promise<ConversionResult> {
  progress('Reading spreadsheet…');
  const tables = await readWorkbook(file);
  const nonempty = tables.filter((table) => table.rows.some((row) => row.some((cell) => cell.trim())));
  if (!nonempty.length) throw new Error('The spreadsheet contains no data to convert.');
  const { PDFDocument } = await import('pdf-lib/dist/pdf-lib.esm.js');
  const pdf = await PDFDocument.create();
  let pages = 0;
  for (const table of nonempty) {
    const columns = Math.max(...table.rows.map((row) => row.length));
    for (let start = 0; start < columns; start += 6) {
      const count = Math.min(6, columns - start);
      const width = count > 4 ? 1684 : 1190;
      const height = count > 4 ? 1190 : 1684;
      const { canvas, context } = browserCanvas(width, height);
      const margin = 48;
      const tableTop = 110;
      const tableBottom = height - 70;
      const cellWidth = (width - margin * 2) / count;
      const lineHeight = 23;
      const padding = 8;
      let rowIndex = 1;
      try {
        const layoutRow = (row: string[], bold: boolean) => {
          context.font = `${bold ? '600 20' : '18'}px Arial, sans-serif`;
          const cells = Array.from({ length: count }, (_, column) => wrapCell(context, row[start + column] ?? '', cellWidth - padding * 2));
          return { cells, height: Math.max(...cells.map((lines) => lines.length)) * lineHeight + padding * 2 };
        };
        const header = layoutRow(table.rows[0], true);
        if (header.height > (tableBottom - tableTop) / 2) throw new Error('The first row is too tall to repeat as a page header. Shorten its cells before converting.');
        do {
          pages++;
          if (pages > CONVERSION_LIMITS.spreadsheetPdfPages) throw new Error('This spreadsheet needs more than 300 PDF pages. Split it into smaller files.');
          progress(`Creating PDF page ${pages} · ${table.name}…`);
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, width, height);
          context.fillStyle = '#172d41';
          context.font = '600 27px Arial, sans-serif';
          const title = `${table.name}${columns > 6 ? ` · columns ${start + 1}–${start + count}` : ''}`;
          // Long sheet names wrap without obscuring the table.
          const titleLines = wrapCell(context, title, width - margin * 2);
          if (titleLines.length > 2) throw new Error('A worksheet name is too long to fit the PDF. Shorten its name and try again.');
          titleLines.forEach((line, index) => context.fillText(line, margin, 48 + index * 31));
          const drawRow = (layout: ReturnType<typeof layoutRow>, top: number, bold: boolean, striped: boolean) => {
            context.font = `${bold ? '600 20' : '18'}px Arial, sans-serif`;
            layout.cells.forEach((lines, column) => {
              const left = margin + column * cellWidth;
              context.fillStyle = bold ? '#e8eef4' : striped ? '#f7f9fb' : '#ffffff';
              context.fillRect(left, top, cellWidth, layout.height);
              context.strokeStyle = '#ced8e1';
              context.lineWidth = 1;
              context.strokeRect(left, top, cellWidth, layout.height);
              context.fillStyle = '#172d41';
              lines.forEach((line, index) => context.fillText(line, left + padding, top + padding + (bold ? 20 : 18) + index * lineHeight));
            });
          };
          drawRow(header, tableTop, true, false);
          let y = tableTop + header.height;
          while (rowIndex < table.rows.length) {
            const layout = layoutRow(table.rows[rowIndex], false);
            if (layout.height > tableBottom - tableTop - header.height) throw new Error(`Row ${rowIndex + 1} in ${table.name} is too tall for one page. Shorten its cells before converting.`);
            if (y + layout.height > tableBottom) break;
            drawRow(layout, y, false, rowIndex % 2 === 0);
            y += layout.height;
            rowIndex++;
          }
          context.font = '17px Arial, sans-serif';
          context.fillStyle = '#647589';
          context.fillText(`Page ${pages} · ${table.name}`, margin, height - 32);
          const embedded = await pdf.embedPng(new Uint8Array(await (await canvasBlob(canvas)).arrayBuffer()));
          const page = pdf.addPage([width / 2, height / 2]);
          page.drawImage(embedded, { x: 0, y: 0, width: width / 2, height: height / 2 });
          await embedded.embed();
          await yieldToBrowser();
        } while (rowIndex < table.rows.length);
      } finally { releaseCanvas(canvas); }
    }
  }
  return {
    blob: safeOutput(new Blob([await pdf.save() as BlobPart], { type: 'application/pdf' })),
    filename: outputName(file.name, '.pdf'),
    summary: `${nonempty.length} sheet${nonempty.length === 1 ? '' : 's'} converted to ${pages} PDF page${pages === 1 ? '' : 's'}.`,
    warnings: ['Creates a readable table PDF with the first row repeated as a header. Empty rows, empty columns and formatting-only cells are omitted. Workbook styling, charts, formulas and print layouts are not preserved; saved cell values are used. The PDF contains rendered page images.', ...(nonempty.length < tables.length ? ['Empty sheets were omitted.'] : [])],
  };
}

/** Group selectable PDF text by baseline, then align separate chunks by x position. */
export function extractPdfTableRows(items: readonly PdfTextChunk[]): string[][] {
  const chunks = items.filter((item) => item.str.trim() && Number.isFinite(item.transform[4]) && Number.isFinite(item.transform[5]));
  if (chunks.length > CONVERSION_LIMITS.pdfTextCells) throw new Error('This PDF page has too much text for a spreadsheet. Try a smaller PDF.');
  const sorted = [...chunks].sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);
  const lines: { y: number; height: number; chunks: PdfTextChunk[] }[] = [];
  for (const chunk of sorted) {
    const y = chunk.transform[5];
    const height = Math.max(1, Math.abs(chunk.height) || Math.abs(chunk.transform[3]) || 10);
    // Baselines are sorted: only recent lines can match. Avoid quadratic scans
    // on PDFs containing thousands of separate lines.
    const line = lines.slice(-4).find((candidate) => Math.abs(candidate.y - y) <= Math.max(2, Math.min(candidate.height, height) * 0.35));
    if (line) line.chunks.push(chunk);
    else lines.push({ y, height, chunks: [chunk] });
    if (lines.length > CONVERSION_LIMITS.pdfTextRows) throw new Error('This PDF page has over 5,000 text rows. Split it into smaller files.');
  }
  const segments = lines.map((line) => {
    const result: { x: number; end: number; text: string }[] = [];
    for (const chunk of line.chunks.sort((a, b) => a.transform[4] - b.transform[4])) {
      const x = chunk.transform[4];
      const last = result[result.length - 1];
      const gap = last ? x - last.end : Infinity;
      if (last && gap <= Math.max(3, line.height * 0.6)) {
        last.text += `${gap > 0.8 && !/\s$/.test(last.text) && !/^\s/.test(chunk.str) ? ' ' : ''}${chunk.str}`;
        last.end = Math.max(last.end, x + chunk.width);
      } else result.push({ x, end: x + chunk.width, text: chunk.str });
    }
    return result;
  });
  const anchors: number[] = [];
  for (const x of segments.flatMap((line) => line.map((segment) => segment.x)).sort((a, b) => a - b)) {
    if (!anchors.length || x - anchors[anchors.length - 1] > 8) anchors.push(x);
    if (anchors.length > CONVERSION_LIMITS.worksheetColumns) throw new Error('The PDF layout contains over 100 text columns. This page is too complex for table extraction.');
  }
  const rows = segments.map((line) => {
    const row = Array<string>(anchors.length).fill('');
    for (const segment of line) {
      let column = 0;
      for (let index = 1; index < anchors.length; index++) if (Math.abs(anchors[index] - segment.x) < Math.abs(anchors[column] - segment.x)) column = index;
      row[column] = `${row[column]}${row[column] ? ' ' : ''}${segment.text.trim()}`;
    }
    return row;
  });
  if (rows.reduce((total, row) => total + row.length, 0) > CONVERSION_LIMITS.pdfTextCells) throw new Error('This PDF page has over 20,000 extracted cells. Split it into smaller files.');
  checkTableSize(rows);
  return rows;
}

async function withPdf<T>(file: File, operation: (pdf: import('pdfjs-dist/types/src/display/api').PDFDocumentProxy) => Promise<T>): Promise<T> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  assertMagic(bytes, 'pdf');
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.mjs';
  const task = pdfjs.getDocument({
    data: bytes,
    cMapUrl: '/vendor/pdfjs/cmaps/',
    cMapPacked: true,
    iccUrl: '/vendor/pdfjs/iccs/',
    standardFontDataUrl: '/vendor/pdfjs/standard_fonts/',
    wasmUrl: '/vendor/pdfjs/wasm/',
    enableXfa: false,
    useSystemFonts: true,
    stopAtErrors: true,
    maxImageSize: CONVERSION_LIMITS.inputImagePixels,
  });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > CONVERSION_LIMITS.pdfPages) throw new Error('This converter supports PDFs with up to 50 pages. Split the PDF first.');
    return await operation(pdf);
  } catch (error) {
    if (error instanceof Error && error.name === 'PasswordException') throw new Error('This PDF is password protected. Unlock a copy before converting.');
    throw error;
  } finally { await task.destroy(); }
}

async function renderPdfPage(pdf: import('pdfjs-dist/types/src/display/api').PDFDocumentProxy, index: number) {
  const page = await pdf.getPage(index);
  let canvas: HTMLCanvasElement | undefined;
  try {
    const original = page.getViewport({ scale: 1 });
    const scale = Math.min(1.5, 4_000 / Math.max(original.width, original.height), Math.sqrt(CONVERSION_LIMITS.canvasPixels / (original.width * original.height)));
    if (!Number.isFinite(scale) || scale <= 0) throw new Error('This PDF has invalid page dimensions.');
    const viewport = page.getViewport({ scale });
    const surface = browserCanvas(viewport.width, viewport.height);
    canvas = surface.canvas;
    await page.render({ canvas, canvasContext: surface.context, viewport, background: '#ffffff' }).promise;
    return { blob: await canvasBlob(canvas), width: canvas.width, height: canvas.height };
  } finally {
    if (canvas) releaseCanvas(canvas);
    page.cleanup();
  }
}

async function pdfToImages(file: File, progress: Progress): Promise<ConversionResult> {
  return withPdf(file, async (pdf) => {
    const images: Record<string, Uint8Array> = {};
    let total = 0;
    let singleBlob: Blob | undefined;
    for (let index = 1; index <= pdf.numPages; index++) {
      progress(`Rendering page ${index} of ${pdf.numPages}…`);
      const { blob } = await renderPdfPage(pdf, index);
      total += blob.size;
      if (total > CONVERSION_LIMITS.outputBytes) throw new Error('The rendered images exceed the browser output limit. Try fewer PDF pages.');
      if (pdf.numPages === 1) singleBlob = blob;
      else images[`page-${String(index).padStart(3, '0')}.png`] = new Uint8Array(await blob.arrayBuffer());
      await yieldToBrowser();
    }
    if (singleBlob) return { blob: safeOutput(singleBlob), filename: outputName(file.name, '.png'), summary: '1 PDF page converted to a PNG image.' };
    const { zipSync } = await import('fflate');
    const archive = zipSync(images, { level: 0 });
    return { blob: safeOutput(new Blob([archive as BlobPart], { type: 'application/zip' })), filename: outputName(file.name, '-images.zip'), summary: `${pdf.numPages} PDF pages converted to PNG images in a ZIP file.` };
  });
}

async function pdfToExcel(file: File, progress: Progress): Promise<ConversionResult> {
  return withPdf(file, async (pdf) => {
    const sheets: { sheet: string; data: { type: StringConstructor; value: string }[][]; columns: { width: number }[] }[] = [];
    const scanned: number[] = [];
    let totalCells = 0;
    let textCharacters = 0;
    let textPages = 0;
    for (let index = 1; index <= pdf.numPages; index++) {
      progress(`Extracting text from page ${index} of ${pdf.numPages}…`);
      const page = await pdf.getPage(index);
      let rows: string[][];
      try {
        const text = await page.getTextContent();
        rows = extractPdfTableRows(text.items.filter((item): item is import('pdfjs-dist/types/src/display/api').TextItem => 'str' in item));
      } finally { page.cleanup(); }
      if (rows.length) textPages++;
      else { scanned.push(index); rows = [['No selectable text on this page. Scanned/image pages need OCR, which this tool does not provide.']]; }
      totalCells += rows.reduce((sum, row) => sum + row.length, 0);
      if (totalCells > CONVERSION_LIMITS.pdfTextCells) throw new Error('This PDF contains over 20,000 extracted cells. Split it into smaller files.');
      for (const row of rows) for (const cell of row) textCharacters += cell.length;
      if (textCharacters > CONVERSION_LIMITS.extractedTextCharacters) throw new Error('This PDF contains over 2 million text characters. Split it into smaller files.');
      const columnCount = Math.max(...rows.map((row) => row.length));
      sheets.push({ sheet: `Page ${index}`, data: rows.map((row) => row.map((value) => ({ type: String, value }))), columns: Array.from({ length: columnCount }, () => ({ width: 24 })) });
      await yieldToBrowser();
    }
    if (!textPages) throw new Error('This PDF contains no selectable text. It appears to be scanned or image-based. OCR is needed to convert it to Excel; use PDF to images here instead.');
    progress('Creating Excel workbook…');
    const { default: writeExcelFile } = await import('write-excel-file/browser');
    const blob = await writeExcelFile(sheets).toBlob();
    return {
      blob: safeOutput(blob),
      filename: outputName(file.name, '.xlsx'),
      summary: `${textPages} page${textPages === 1 ? '' : 's'} of selectable text extracted into an Excel workbook.`,
      warnings: ['Columns are estimated from text positions. Review the workbook before using it: tables, cell types, formulas and original formatting cannot be reliably restored. All values are stored as text.', ...(scanned.length ? [`Pages ${scanned.join(', ')} contain no selectable text and are marked in the workbook. OCR is not included.`] : [])],
    };
  });
}

type ExtractedPdfPage = { page: number; rows: string[][]; hasText: boolean };

async function extractPdfPages(pdf: import('pdfjs-dist/types/src/display/api').PDFDocumentProxy, progress: Progress) {
  const pages: ExtractedPdfPage[] = [];
  let textCharacters = 0;
  let textPages = 0;
  let textRows = 0;
  for (let index = 1; index <= pdf.numPages; index++) {
    progress(`Extracting text from page ${index} of ${pdf.numPages}…`);
    const page = await pdf.getPage(index);
    let rows: string[][];
    try {
      const text = await page.getTextContent();
      rows = extractPdfTableRows(text.items.filter((item): item is import('pdfjs-dist/types/src/display/api').TextItem => 'str' in item));
    } finally { page.cleanup(); }
    const hasText = rows.length > 0;
    if (hasText) textPages++;
    textRows += rows.length;
    if (textRows > CONVERSION_LIMITS.extractedTextRows) throw new Error('This PDF contains over 20,000 text rows. Split it into smaller files.');
    for (const row of rows) for (const cell of row) textCharacters += cell.length;
    if (textCharacters > CONVERSION_LIMITS.extractedTextCharacters) throw new Error('This PDF contains over 2 million text characters. Split it into smaller files.');
    pages.push({ page: index, rows, hasText });
    await yieldToBrowser();
  }
  if (!textPages) throw new Error('This PDF contains no selectable text. Scanned or image-based pages need OCR, which this tool does not provide. Use PDF to images or PDF to PowerPoint instead.');
  return pages;
}

async function pdfToTextDocument(file: File, mode: 'pdf-word' | 'pdf-text', progress: Progress): Promise<ConversionResult> {
  return withPdf(file, async (pdf) => {
    const pages = await extractPdfPages(pdf, progress);
    const scanned = pages.filter((page) => !page.hasText).map((page) => page.page);
    const warnings = [
      'Extracts selectable text only. Original formatting, images, tables and exact reading order are not preserved. Review the result before using it.',
      ...(scanned.length ? [`Pages ${scanned.join(', ')} have no selectable text and are marked in the result. OCR is not included.`] : []),
    ];
    const noText = 'No selectable text on this page. OCR is required for scanned or image-based content.';
    if (mode === 'pdf-text') {
      const text = pages.map((page) => `--- Page ${page.page} ---\n${page.hasText ? page.rows.map((row) => row.join('\t')).join('\n') : noText}`).join('\n\n');
      return {
        blob: safeOutput(new Blob([text], { type: 'text/plain;charset=utf-8' })),
        filename: outputName(file.name, '.txt'),
        summary: `Selectable text from ${pages.length - scanned.length} PDF page${pages.length - scanned.length === 1 ? '' : 's'} saved as a text file.`,
        warnings,
      };
    }
    progress('Creating Word document…');
    const { Document, Packer, Paragraph, TextRun, Tab, HeadingLevel } = await import('docx');
    const paragraphs: InstanceType<typeof Paragraph>[] = [];
    for (const page of pages) {
      paragraphs.push(new Paragraph({ text: `Page ${page.page}`, heading: HeadingLevel.HEADING_1, pageBreakBefore: page.page > 1 }));
      if (!page.hasText) paragraphs.push(new Paragraph(noText));
      else for (const row of page.rows) {
        const children = row.flatMap((text, index) => index ? [new Tab(), text] : [text]);
        paragraphs.push(new Paragraph({ children: [new TextRun({ children, font: 'Arial', size: 22 })], spacing: { after: 120 } }));
      }
    }
    const document = new Document({ creator: 'RegisterBox', title: outputName(file.name, ''), sections: [{ children: paragraphs }] });
    const blob = await Packer.toBlob(document);
    return {
      blob: safeOutput(blob),
      filename: outputName(file.name, '.docx'),
      summary: `Selectable text from ${pages.length - scanned.length} PDF page${pages.length - scanned.length === 1 ? '' : 's'} saved in an editable Word document.`,
      warnings,
    };
  });
}

function base64Bytes(bytes: Uint8Array) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 16_384) binary += String.fromCharCode(...bytes.subarray(index, index + 16_384));
  return btoa(binary);
}

async function pdfToPowerPoint(file: File, progress: Progress): Promise<ConversionResult> {
  return withPdf(file, async (pdf) => {
    const { default: PptxGenJS } = await import('pptxgenjs');
    const presentation = new PptxGenJS();
    presentation.layout = 'LAYOUT_WIDE';
    presentation.author = 'RegisterBox';
    presentation.subject = 'PDF pages rendered as images';
    presentation.title = outputName(file.name, '');
    let total = 0;
    for (let index = 1; index <= pdf.numPages; index++) {
      progress(`Creating slide ${index} of ${pdf.numPages}…`);
      const rendered = await renderPdfPage(pdf, index);
      total += rendered.blob.size;
      if (total > CONVERSION_LIMITS.outputBytes) throw new Error('The rendered slides exceed the browser output limit. Try fewer PDF pages.');
      const data = `image/png;base64,${base64Bytes(new Uint8Array(await rendered.blob.arrayBuffer()))}`;
      const slide = presentation.addSlide();
      slide.background = { color: 'FFFFFF' };
      const scale = Math.min((40 / 3) / rendered.width, 7.5 / rendered.height);
      const width = rendered.width * scale;
      const height = rendered.height * scale;
      slide.addImage({ data, x: ((40 / 3) - width) / 2, y: (7.5 - height) / 2, w: width, h: height, altText: `PDF page ${index}` });
      await yieldToBrowser();
    }
    progress('Packaging PowerPoint presentation…');
    const binary = await presentation.write({ outputType: 'arraybuffer', compression: true });
    return {
      blob: safeOutput(new Blob([binary as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })),
      filename: outputName(file.name, '.pptx'),
      summary: `${pdf.numPages} PDF page${pdf.numPages === 1 ? '' : 's'} converted to ${pdf.numPages} PowerPoint slide${pdf.numPages === 1 ? '' : 's'}.`,
      warnings: ['Each slide contains an image of the PDF page, fitted without cropping. Text, shapes and other page elements are not separately editable. Large pages may be resized.'],
    };
  });
}

export async function convertFiles(files: readonly File[], mode: ConversionMode, onProgress?: Progress): Promise<ConversionResult> {
  validateConversionFiles(files, mode);
  const progress = onProgress ?? (() => {});
  progress('Preparing conversion…');
  await yieldToBrowser();
  try {
    if (mode === 'images-pdf') return await imagesToPdf(files, progress);
    if (mode === 'excel-pdf') return await workbookToPdf(files[0], progress);
    if (mode === 'pdf-images') return await pdfToImages(files[0], progress);
    if (mode === 'pdf-excel') return await pdfToExcel(files[0], progress);
    if (mode === 'pdf-word' || mode === 'pdf-text') return await pdfToTextDocument(files[0], mode, progress);
    if (mode === 'pdf-powerpoint') return await pdfToPowerPoint(files[0], progress);
    const { convertOfficeToPdf } = await import('./office-converter.web');
    return await convertOfficeToPdf(files[0], mode, progress);
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'InvalidPDFException' || error.name === 'MissingPDFException') throw new Error('This PDF is damaged or cannot be read. Save a fresh copy and try again.');
      if (error.message.includes('Image exceeded maximum allowed size')) throw new Error('This PDF contains an image larger than 24 megapixels. Resize the PDF images before converting.');
      throw error;
    }
    throw new Error('The file could not be converted. Try an undamaged file in a supported format.');
  }
}
