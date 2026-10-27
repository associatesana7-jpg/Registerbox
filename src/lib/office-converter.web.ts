import type { ConversionResult } from './file-converter.web';
import { unzipConverterArchive } from './converter-archive';
import { inspectConverterRaster } from './converter-images.web';

type OfficeMode = 'word-pdf' | 'powerpoint-pdf' | 'text-pdf' | 'opendocument-pdf';
type ArchiveKind = 'docx' | 'pptx' | 'odt' | 'odp' | 'ods';
type Progress = (message: string) => void;
type Archive = Record<string, Uint8Array>;
const LIMITS = { input: 5_000_000, unpacked: 24_000_000, xml: 5_000_000, entries: 2_000, pages: 50, nodes: 50_000, characters: 200_000, canvas: 8_000_000, output: 100_000_000 };
const decoder = new TextDecoder('utf-8', { fatal: true });
const ext = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';
const outputName = (name: string) => `${name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').slice(0, 100) || 'converted'}.pdf`;
const pause = () => new Promise<void>(resolve => setTimeout(resolve, 0));

function decodeOfficeAttribute(value: string) {
  return value.replace(/&([^;]*);/g, (_all, entity: string) => {
    const named: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' };
    if (Object.hasOwn(named, entity)) return named[entity];
    const numeric = entity.match(/^#(?:x([\da-f]+)|(\d+))$/i);
    const point = numeric ? Number.parseInt(numeric[1] ?? numeric[2], numeric[1] ? 16 : 10) : NaN;
    if (!Number.isSafeInteger(point) || point <= 0 || point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff)) throw new Error('This document has an invalid XML attribute. Save a fresh copy.');
    return String.fromCodePoint(point);
  });
}

function xmlText(bytes: Uint8Array) {
  if (bytes.length > LIMITS.xml) throw new Error('A document part is too large. Split the document into smaller files.');
  let text: string;
  try { text = decoder.decode(bytes); } catch { throw new Error('This document contains unreadable XML. Save a fresh copy and try again.'); }
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('Documents containing XML entities or document type declarations are not supported. Save a clean copy first.');
  if ((text.match(/</g)?.length ?? 0) > LIMITS.nodes) throw new Error('This document has too many elements for browser conversion. Split it into smaller files.');
  // DOCX VML styles reach CSS text in the renderer. Check decoded attribute
  // values before any DOM is connected, including XML and CSS escape forms.
  const tags = text.replace(/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>/g, '').matchAll(/<[^\s!?/<>]+(?:[^"'<>]|"[^"]*"|'[^']*')*>/g);
  for (const tag of tags) for (const attribute of tag[0].matchAll(/\b[\w:.-]+\s*=\s*(["'])([\s\S]*?)\1/g)) {
    const decoded = attribute[2].replace(/&(?:#x([\da-f]+)|#(\d+)|(amp|lt|gt|quot|apos));/gi, (entity, hex, decimal, named) => {
      if (hex || decimal) {
        const point = Number.parseInt(hex || decimal, hex ? 16 : 10);
        return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '';
      }
      return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" } as Record<string, string>)[String(named).toLowerCase()] ?? entity;
    }).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\\([\da-f]{1,6})\s?|\\([^\r\n\da-f])|\\\r?\n/gi, (_all, hex, escaped) => hex ? String.fromCodePoint(Math.min(0x10ffff, Number.parseInt(hex, 16))) : escaped || '');
    if (/url\s*\(|@import|image-set\s*\(|(?:^|;)\s*(?:behavior|-moz-binding)\s*:/i.test(decoded)) {
      throw new Error('This document contains CSS resource loads or active styles. Remove linked or inline background resources and save a clean copy.');
    }
  }
  return text;
}

/** Inspect all ZIP entries before any Office renderer or XML parser receives them. */
export async function inspectOfficeArchive(bytes: Uint8Array, kind: ArchiveKind): Promise<Archive> {
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 3 || bytes[3] !== 4) {
    throw new Error('This is not a readable Office document. Encrypted and older binary files must first be saved as DOCX, PPTX or OpenDocument.');
  }
  const archive = await unzipConverterArchive(bytes, { maxUncompressedBytes: LIMITS.unpacked, maxEntries: LIMITS.entries });
  for (const name of Object.keys(archive)) {
    if (!name.endsWith('/') && /(?:^|\/)(?:embeddings|activex|scripts|basic)(?:\/|$)|vbaproject|oleobject|\.(?:exe|dll|js|html?|mhtml)$/i.test(name)) {
      throw new Error('Documents with macros, embedded objects or active HTML cannot be converted here. Remove those items and save a clean copy.');
    }
  }
  const main = kind === 'docx' ? 'word/document.xml' : kind === 'pptx' ? 'ppt/presentation.xml' : 'content.xml';
  if (!archive[main]) throw new Error(`The file is not a valid ${kind.toUpperCase()} document. Check the file type and try again.`);
  const imageTypes = new Map<string, string>();
  if (archive['[Content_Types].xml']) {
    const typesXml = xmlText(archive['[Content_Types].xml']);
    const { XMLParser, XMLValidator } = await import('fast-xml-parser');
    if (XMLValidator.validate(typesXml) !== true) throw new Error('This document has invalid content-type declarations. Save a fresh copy.');
    const types = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', removeNSPrefix: true, parseAttributeValue: false, processEntities: false, attributeValueProcessor: (_name, value) => typeof value === 'string' ? decodeOfficeAttribute(value) : value }).parse(typesXml)?.Types;
    const list = (value: unknown) => value === undefined ? [] : Array.isArray(value) ? value : [value];
    const defaults = new Map<string, string>();
    for (const item of list(types?.Default)) {
      if (typeof item?.['@_Extension'] === 'string' && typeof item?.['@_ContentType'] === 'string') defaults.set(item['@_Extension'].toLowerCase(), item['@_ContentType'].toLowerCase());
    }
    for (const name of Object.keys(archive)) {
      const mime = defaults.get(ext(name));
      if (mime) imageTypes.set(name, mime);
    }
    for (const item of list(types?.Override)) {
      if (typeof item?.['@_PartName'] === 'string' && typeof item?.['@_ContentType'] === 'string') imageTypes.set(item['@_PartName'].replace(/^\//, '').normalize('NFC'), item['@_ContentType'].toLowerCase());
    }
  }
  let textCharacters = 0;
  let rasterPixels = 0;
  for (const [name, data] of Object.entries(archive)) {
    const prefix = new TextDecoder().decode(data.subarray(0, 500)).replace(/^\uFEFF/, '').trimStart();
    if (/\.svg$/i.test(name) || /<(?:[\w.-]+:)?svg(?:\s|>)/i.test(prefix)) {
      throw new Error('Embedded SVG images are not supported in this converter. Replace them with PNG or JPG and save a new copy.');
    }
    const raster = inspectConverterRaster(data);
    const declaredMime = imageTypes.get(name);
    if (declaredMime?.startsWith('image/')) {
      const allowed = ({ 'image/png': 'png', 'image/jpeg': 'jpeg', 'image/jpg': 'jpeg', 'image/gif': 'gif', 'image/webp': 'webp' } as Record<string, string>)[declaredMime];
      if (!allowed || !raster || raster.kind !== allowed) throw new Error('An embedded image type is unsupported or does not match its contents. Replace it with PNG, JPG or WebP and save a new copy.');
    }
    if (/\.(?:png|jpe?g|gif|webp|bmp|tiff?|emf|wmf|ico)$/i.test(name) && !raster) {
      throw new Error('An embedded image is damaged or uses an unsupported format. Replace it with PNG, JPG or WebP.');
    }
    if (/\.(?:xml|rels|svg)$/i.test(name) || prefix.startsWith('<')) {
      const text = xmlText(data);
      if (/<(?:[\w.-]+:)?svg(?:\s|>)/i.test(text)) throw new Error('Embedded SVG images are not supported. Replace them with PNG or JPG and save a new copy.');
      textCharacters += text.replace(/<[^>]*>/g, '').length;
      if (textCharacters > LIMITS.characters) throw new Error('This document contains more than 200,000 text characters. Split it into smaller files.');
      if (/<(?:\w+:)?(?:altChunk|oleObject|externalData)\b/i.test(text)) throw new Error('This document contains embedded or linked content. Remove it and save a clean copy.');
      if (/\.rels$/i.test(name)) {
        for (const match of text.matchAll(/<(?:\w+:)?Relationship\b([^>]*)\/?\s*>/gi)) {
          const attrs = match[1];
          // Hyperlinks are never followed; the final rendering removes link targets.
          if (/\bType\s*=\s*["'][^"']*\/hyperlink["']/i.test(attrs)) continue;
          if (/\bTargetMode\s*=\s*["']External["']|\bTarget\s*=\s*["'](?:[a-z][a-z\d+.-]*:|\/\/)/i.test(attrs)) {
            throw new Error('This document links to an external resource. Embed the image or other resource in the file before converting.');
          }
        }
      }
      if (kind.startsWith('od')) {
        if (/encryption-data/i.test(text)) throw new Error('Password-protected OpenDocument files must first be saved without encryption.');
        for (const match of text.matchAll(/<([\w:-]+)\b([^>]*\bxlink:href\s*=\s*["']([^"']*)["'][^>]*)>/gi)) {
          if (match[1] === 'text:a') continue;
          if (/^(?:[a-z][a-z\d+.-]*:|\/\/|\/)|(?:^|\/)\.\.(?:\/|$)/i.test(match[3])) throw new Error('This OpenDocument file links to an external resource. Embed it in the document first.');
        }
      }
    }
    rasterPixels += checkRasterHeader(name, data);
    if (rasterPixels > 48_000_000) throw new Error('Embedded images exceed 48 megapixels in total. Resize or remove some images before converting.');
  }
  return archive;
}

function checkRasterHeader(_name: string, bytes: Uint8Array) {
  const image = inspectConverterRaster(bytes);
  return image ? image.width * image.height : 0;
}

/** Plain-text RTF extraction, with group destinations and Unicode fallbacks handled. */
export function parseRtfText(source: string): string {
  if (!/^\s*\{\\rtf\d/i.test(source)) throw new Error('This is not a readable RTF file. Save it again as RTF or UTF-8 text.');
  const stack: { skip: boolean; uc: number }[] = [];
  let state = { skip: false, uc: 1 };
  let fallback = 0;
  let output = '';
  const append = (value: string) => { if (fallback > 0) fallback--; else if (!state.skip) output += value; };
  const destinations = new Set(['fonttbl', 'colortbl', 'stylesheet', 'info', 'pict', 'object', 'objdata', 'header', 'footer', 'headerl', 'headerr', 'footerl', 'footerr', 'annotation', 'fldinst', 'datastore', 'themedata', 'xmlnstbl', 'listtable', 'listoverridetable', 'generator']);
  for (let index = 0; index < source.length;) {
    const char = source[index++];
    if (char === '{') { stack.push({ ...state }); if (stack.length > 200) throw new Error('The RTF nesting is too deep. Save a simpler copy.'); }
    else if (char === '}') { state = stack.pop() ?? { skip: false, uc: 1 }; }
    else if (char === '\\') {
      const next = source[index++];
      if (next === '\\' || next === '{' || next === '}') append(next);
      else if (next === '*') state.skip = true;
      else if (next === "'") {
        const hex = source.slice(index, index + 2);
        index += 2;
        if (/^[\da-f]{2}$/i.test(hex)) append(new TextDecoder('windows-1252').decode(Uint8Array.of(parseInt(hex, 16))));
      } else if (next === '~') append('\u00a0');
      else if (next === '_') append('\u2011');
      else if (/[a-z]/i.test(next || '')) {
        const start = index - 1;
        while (/[a-z]/i.test(source[index] || '')) index++;
        const word = source.slice(start, index).toLowerCase();
        const numberStart = index;
        if (source[index] === '-') index++;
        while (/\d/.test(source[index] || '')) index++;
        const value = Number(source.slice(numberStart, index));
        if (source[index] === ' ') index++;
        if (destinations.has(word)) state.skip = true;
        else if (word === 'uc') state.uc = Math.min(16, Math.max(0, value));
        else if (word === 'u') { if (!state.skip) output += String.fromCharCode(value < 0 ? value + 65_536 : value); fallback = state.uc; }
        else if (word === 'bin') index += Math.max(0, value);
        else if (word === 'par' || word === 'line') { if (!state.skip) output += '\n'; }
        else if (word === 'tab') { if (!state.skip) output += '\t'; }
        else if (word === 'emdash') append('—');
        else if (word === 'endash') append('–');
        else if (word === 'bullet') append('•');
        else if (word === 'lquote' || word === 'rquote') append(word === 'lquote' ? '‘' : '’');
        else if (word === 'ldblquote' || word === 'rdblquote') append(word === 'ldblquote' ? '“' : '”');
      }
    } else if (char !== '\r' && char !== '\n') append(char);
    if (output.length > LIMITS.characters) throw new Error('This text document is too long. Split it into smaller files.');
  }
  return output.trim();
}

function textContent(fileBytes: Uint8Array) {
  let encoding = 'utf-8';
  if (fileBytes[0] === 255 && fileBytes[1] === 254) encoding = 'utf-16le';
  else if (fileBytes[0] === 254 && fileBytes[1] === 255) encoding = 'utf-16be';
  try { return new TextDecoder(encoding, { fatal: true }).decode(fileBytes).replace(/^\uFEFF/, ''); }
  catch { throw new Error('Save this text file as UTF-8 or UTF-16 and try again.'); }
}

function canvas(width: number, height: number) {
  const element = document.createElement('canvas');
  element.width = Math.ceil(width);
  element.height = Math.ceil(height);
  const context = element.getContext('2d');
  if (!context) throw new Error('This browser could not create an image. Try another browser.');
  return { element, context };
}
function blobFromCanvas(element: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => element.toBlob(blob => blob ? resolve(blob) : reject(new Error('This browser could not encode a PDF page.')), 'image/jpeg', 0.95));
}
async function finalPdf(pdf: import('pdf-lib').PDFDocument, file: File, summary: string, warnings: string[]): Promise<ConversionResult> {
  const bytes = await pdf.save();
  if (bytes.length > LIMITS.output) throw new Error('The converted PDF is too large. Try fewer pages or smaller images.');
  return { blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }), filename: outputName(file.name), summary, warnings };
}

async function textToPdf(file: File, progress: Progress): Promise<ConversionResult> {
  let text = textContent(new Uint8Array(await file.arrayBuffer()));
  const kind = ext(file.name);
  if (kind === 'rtf') text = parseRtfText(text);
  if (!text.trim()) throw new Error('This file contains no text to convert.');
  if (text.includes('\u0000')) throw new Error('This does not look like a text file. Save it as UTF-8 text and try again.');
  if (text.length > LIMITS.characters) throw new Error('This tool supports up to 200,000 text characters. Split the document into smaller files.');
  const { PDFDocument } = await import('pdf-lib/dist/pdf-lib.esm.js');
  const pdf = await PDFDocument.create();
  const { element, context } = canvas(1190, 1684);
  const font = kind === 'md' ? '24px monospace' : '25px Arial, sans-serif';
  context.font = font;
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n')) {
    if (paragraph.length > 20_000) throw new Error('A text line is too long. Add line breaks before converting.');
    let current = '';
    for (const word of paragraph.split(/(\s+)/)) {
      if (current && context.measureText(current + word).width > 1030) { lines.push(current.trimEnd()); current = ''; }
      if (context.measureText(word).width > 1030) {
        for (const character of Array.from(word)) {
          if (context.measureText(current + character).width > 1030) { lines.push(current); current = ''; }
          current += character;
        }
      } else current += word;
    }
    lines.push(current);
  }
  const perPage = 43;
  const pageCount = Math.ceil(lines.length / perPage);
  if (pageCount > LIMITS.pages) throw new Error('This text needs more than 50 PDF pages. Split the document into smaller files.');
  try {
    for (let index = 0; index < pageCount; index++) {
      progress(`Creating text page ${index + 1} of ${pageCount}…`);
      context.fillStyle = '#ffffff'; context.fillRect(0, 0, element.width, element.height);
      context.fillStyle = '#111827'; context.font = font; context.textBaseline = 'top';
      lines.slice(index * perPage, (index + 1) * perPage).forEach((line, row) => context.fillText(line, 80, 80 + row * 35));
      const image = await pdf.embedJpg(await (await blobFromCanvas(element)).arrayBuffer());
      pdf.addPage([595.28, 841.89]).drawImage(image, { x: 0, y: 0, width: 595.28, height: 841.89 });
      await image.embed();
      await pause();
    }
  } finally { element.width = 0; element.height = 0; }
  return finalPdf(pdf, file, `${pageCount} text page${pageCount === 1 ? '' : 's'} converted to PDF.`, [kind === 'rtf' ? 'RTF text was extracted. Formatting, pictures, headers and footers are not preserved.' : kind === 'md' ? 'Markdown is preserved as plain text, including its formatting marks.' : 'Text was laid out using a browser font.', 'PDF pages are images; their text is not searchable or editable.']);
}

function parseXml(bytes: Uint8Array): XMLDocument {
  const document = new DOMParser().parseFromString(xmlText(bytes), 'application/xml');
  if (document.getElementsByTagName('parsererror').length) throw new Error('This document contains damaged XML. Save a new copy and try again.');
  return document;
}
const children = (node: Element | Document, local: string) => Array.from(node.children).filter(child => child.localName === local);
const child = (node: Element | Document | undefined | null, local: string) => node ? Array.from(node.children).find(item => item.localName === local) : undefined;
const descendants = (node: Element | Document, local: string) => Array.from(node.getElementsByTagNameNS('*', local));
const first = (node: Element | Document | undefined | null, local: string) => node ? descendants(node, local)[0] : undefined;
function number(value: string | null | undefined, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function safeColor(value: string | null | undefined, fallback = '#172033') { return /^[a-f\d]{6}$/i.test(value ?? '') ? `#${value}` : fallback; }
function archivePath(base: string, target: string) {
  const result = target.startsWith('/') ? [] : base.split('/').slice(0, -1);
  for (const part of target.replace(/\\/g, '/').split('/')) { if (part === '..') result.pop(); else if (part && part !== '.') result.push(part); }
  return result.join('/');
}
function relationships(archive: Archive, path: string) {
  const [folder, name] = [path.slice(0, path.lastIndexOf('/') + 1), path.slice(path.lastIndexOf('/') + 1)];
  const bytes = archive[`${folder}_rels/${name}.rels`];
  const result: Record<string, string> = {};
  if (bytes) for (const rel of descendants(parseXml(bytes), 'Relationship')) {
    if (rel.getAttribute('TargetMode') === 'External') continue;
    result[rel.getAttribute('Id') ?? ''] = archivePath(path, rel.getAttribute('Target') ?? '');
  }
  return result;
}
function dataImage(path: string, archive: Archive) {
  const bytes = archive[path];
  if (!bytes) throw new Error('An embedded image is missing from this document. Save a fresh copy.');
  const kind = ext(path);
  const mime = ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' } as Record<string, string>)[kind];
  if (!mime) throw new Error('An embedded image uses an unsupported format. Replace it with PNG or JPG and try again.');
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32_768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
  return `data:${mime};base64,${btoa(binary)}`;
}

async function isolatedDocument() {
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-same-origin');
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('data-clarity-mask', 'true');
  frame.tabIndex = -1;
  frame.style.cssText = 'position:fixed;left:-20000px;top:0;width:1800px;height:1800px;border:0;pointer-events:none;';
  const loaded = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('The browser could not prepare document rendering. Try another browser.')), 10_000);
    frame.onload = () => { clearTimeout(timeout); resolve(); };
  });
  frame.srcdoc = '<!doctype html><html data-clarity-mask="true"><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'none\'; connect-src \'none\'; img-src data: blob:; font-src data: blob:; style-src \'unsafe-inline\'; object-src \'none\'; media-src \'none\'; base-uri \'none\'; form-action \'none\'"><style>html,body{margin:0;padding:0;background:white;font-family:Arial,sans-serif;color:#172033}*{box-sizing:border-box}p{margin:0 0 10px;white-space:pre-wrap}table{border-collapse:collapse;width:100%}td,th{border:1px solid #d1d5db;padding:6px;white-space:pre-wrap;overflow-wrap:anywhere}img{max-width:100%}</style></head><body></body></html>';
  document.body.append(frame);
  try {
    await loaded;
    const doc = frame.contentDocument;
    if (!doc) throw new Error('This browser could not create an isolated document.');
    return { frame, doc };
  } catch (error) { frame.remove(); throw error; }
}

async function capturePages(file: File, elements: HTMLElement[], progress: Progress, warnings: string[], expectedHeight?: number): Promise<ConversionResult> {
  const [{ PDFDocument }, { default: html2canvas }] = await Promise.all([import('pdf-lib/dist/pdf-lib.esm.js'), import('html2canvas')]);
  const pdf = await PDFDocument.create();
  let count = 0;
  let encodedBytes = 0;
  let decodedPixels = 0;
  const decodedSources = new Set<string>();
  for (const element of elements) {
    element.querySelectorAll('a').forEach(anchor => anchor.removeAttribute('href'));
    element.querySelectorAll('script,iframe,object,embed,audio,video,link').forEach(node => node.remove());
    const images = Array.from(element.querySelectorAll('img'));
    if (images.length > 200) throw new Error('A page contains too many images. Split the document into smaller files.');
    for (const image of images) {
      if (image.src && !/^(?:data:|blob:)/i.test(image.src)) throw new Error('Only embedded images can be converted.');
      try { await image.decode(); } catch { throw new Error('An embedded image could not be rendered. Replace it with PNG or JPG.'); }
      if (image.naturalWidth * image.naturalHeight > 24_000_000) throw new Error('An embedded image exceeds 24 megapixels. Resize it first.');
      if (!decodedSources.has(image.src)) {
        decodedPixels += image.naturalWidth * image.naturalHeight;
        if (decodedPixels > 48_000_000) throw new Error('Embedded images exceed 48 megapixels in total. Resize or remove some images before converting.');
        decodedSources.add(image.src);
      }
    }
    const bounds = element.getBoundingClientRect();
    const width = Math.ceil(Math.max(bounds.width, element.scrollWidth));
    const height = Math.ceil(Math.max(bounds.height, element.scrollHeight));
    const computed = element.ownerDocument.defaultView?.getComputedStyle(element);
    const nominalHeight = expectedHeight || number(computed?.minHeight?.replace('px', '')) || Math.min(height, Math.round(width * Math.SQRT2));
    if (width < 20 || width > 2500 || height > 100_000 || nominalHeight < 20 || nominalHeight > 3500) throw new Error('This document has unusually large page dimensions. Save standard-size pages before converting.');
    // CSS page heights can be fractional while scrollHeight rounds to integers.
    const pieces = Math.max(1, Math.ceil((height - 1) / nominalHeight));
    for (let index = 0; index < pieces; index++) {
      if (++count > LIMITS.pages) throw new Error('This document needs more than 50 PDF pages. Split it into smaller files.');
      progress(`Rendering PDF page ${count}…`);
      const sliceHeight = Math.min(nominalHeight, height - index * nominalHeight);
      const scale = Math.min(1.5, Math.sqrt(LIMITS.canvas / (width * sliceHeight)));
      // html2canvas x/y offsets are relative to the element's own bounding box.
      const rendered = await html2canvas(element, { backgroundColor: '#ffffff', width, height: sliceHeight, x: 0, y: index * nominalHeight, scale, logging: false, useCORS: false, allowTaint: false, imageTimeout: 10_000, windowWidth: 1800, windowHeight: 1800, removeContainer: true });
      try {
        const blob = await blobFromCanvas(rendered);
        encodedBytes += blob.size;
        if (encodedBytes > LIMITS.output) throw new Error('The rendered document is too large. Try fewer pages or smaller images.');
        const image = await pdf.embedJpg(await blob.arrayBuffer());
        const pdfWidth = width * 0.75;
        const pdfHeight = nominalHeight * 0.75;
        pdf.addPage([pdfWidth, pdfHeight]).drawImage(image, { x: 0, y: pdfHeight - sliceHeight * 0.75, width: pdfWidth, height: sliceHeight * 0.75 });
        await image.embed();
      } finally { rendered.width = 0; rendered.height = 0; }
      await pause();
    }
  }
  if (!count) throw new Error('This document contains no pages to convert.');
  return finalPdf(pdf, file, `${count} page${count === 1 ? '' : 's'} converted to PDF.`, [...new Set([...warnings, 'PDF pages are images; their text is not searchable or editable.'])]);
}

async function wordToPdf(file: File, archive: Archive, progress: Progress): Promise<ConversionResult> {
  progress('Preparing Word pages…');
  const isolated = await isolatedDocument();
  try {
    const { renderAsync } = await import('docx-preview');
    const body = isolated.doc.createElement('div');
    const styles = isolated.doc.createElement('div');
    // renderAsync clears its style container: keep the iframe's CSP meta outside it.
    isolated.doc.head.append(styles);
    isolated.doc.body.append(body);
    const { zipSync } = await import('fflate');
    // Render the exact bounded, inspected entries. Never parse the attacker's
    // original archive a second time through another ZIP implementation.
    const inspected = zipSync(archive, { level: 0 });
    await renderAsync(inspected, body, styles, { className: 'rbdocx', inWrapper: false, breakPages: true, ignoreLastRenderedPageBreak: false, ignoreFonts: true, useBase64URL: true, renderAltChunks: false, renderHeaders: true, renderFooters: true, renderFootnotes: true, renderEndnotes: true, renderChanges: false, renderComments: false });
    // Styles are confined to this script-disabled iframe; reset global defaults that the renderer clears.
    const reset = isolated.doc.createElement('style');
    reset.textContent = 'html,body{margin:0;padding:0;background:white}section.rbdocx{margin:0!important;box-shadow:none!important;overflow:visible!important}';
    isolated.doc.head.append(reset);
    const pages = Array.from(body.querySelectorAll<HTMLElement>('section.rbdocx'));
    if (pages.length > LIMITS.pages || body.querySelectorAll('*').length > LIMITS.nodes) throw new Error('This Word file is too complex or has more than 50 pages. Split it into smaller documents.');
    const warnings = ['Word layout is approximated in the browser. Fonts, page breaks, fields and tracked changes can differ from Word; review the PDF before sharing. Overflow is continued onto additional pages.'];
    if (Object.keys(archive).some(name => /(?:charts|diagrams)\//.test(name))) warnings.push('This document contains charts or SmartArt that the browser renderer may not reproduce.');
    return await capturePages(file, pages, progress, warnings);
  } finally { isolated.frame.remove(); }
}

function fillColor(node: Element | undefined, theme: Record<string, string>, fallback = 'transparent') {
  if (!node || child(node, 'noFill')) return fallback;
  const fill = child(node, 'solidFill') ?? (node.localName === 'solidFill' ? node : undefined);
  const color = fill ? Array.from(fill.children)[0] : undefined;
  if (color?.localName === 'srgbClr') return safeColor(color.getAttribute('val'), fallback);
  if (color?.localName === 'schemeClr') return theme[color.getAttribute('val') ?? ''] ?? fallback;
  return fallback;
}

function drawPptxText(source: Element, box: HTMLElement, scale: number, theme: Record<string, string>, inherited?: Element) {
  const doc = box.ownerDocument;
  const body = first(source, 'txBody');
  if (!body) return;
  const inheritedBody = first(inherited, 'txBody');
  const bodyPr = child(body, 'bodyPr') ?? child(inheritedBody, 'bodyPr');
  box.style.padding = `${number(bodyPr?.getAttribute('tIns'), 45_720) * scale}px ${number(bodyPr?.getAttribute('rIns'), 91_440) * scale}px ${number(bodyPr?.getAttribute('bIns'), 45_720) * scale}px ${number(bodyPr?.getAttribute('lIns'), 91_440) * scale}px`;
  box.style.display = 'flex'; box.style.flexDirection = 'column';
  const anchor = bodyPr?.getAttribute('anchor');
  box.style.justifyContent = anchor === 'ctr' ? 'center' : anchor === 'b' ? 'flex-end' : 'flex-start';
  for (const paragraph of children(body, 'p')) {
    const p = doc.createElement('p');
    p.style.margin = '0'; p.style.lineHeight = '1.2'; p.style.overflowWrap = 'anywhere';
    const props = child(paragraph, 'pPr');
    const defaults = child(props, 'defRPr') ?? first(inheritedBody, 'defRPr');
    const align = props?.getAttribute('algn');
    p.style.textAlign = align === 'ctr' ? 'center' : align === 'r' ? 'right' : align === 'just' ? 'justify' : 'left';
    const bullet = first(props, 'buChar');
    if (bullet) p.append(`${bullet.getAttribute('char') || '•'} `);
    for (const run of Array.from(paragraph.children)) {
      if (run.localName === 'br') { p.append(doc.createElement('br')); continue; }
      if (!['r', 'fld'].includes(run.localName)) continue;
      const span = doc.createElement('span');
      const style = child(run, 'rPr') ?? defaults;
      span.textContent = descendants(run, 't').map(text => text.textContent ?? '').join('');
      const placeholderType = first(source, 'ph')?.getAttribute('type');
      const defaultSize = placeholderType === 'title' || placeholderType === 'ctrTitle' ? 3400 : 1800;
      span.style.fontSize = `${Math.max(8, Math.min(180, number(style?.getAttribute('sz'), number(defaults?.getAttribute('sz'), defaultSize)) * 127 * scale))}px`;
      span.style.color = fillColor(style, theme, '#172033');
      span.style.fontWeight = style?.getAttribute('b') === '1' ? '700' : '400';
      span.style.fontStyle = style?.getAttribute('i') === '1' ? 'italic' : 'normal';
      if (style?.getAttribute('u') && style.getAttribute('u') !== 'none') span.style.textDecoration = 'underline';
      p.append(span);
    }
    if (!p.childNodes.length) p.append('\u00a0');
    box.append(p);
  }
}

async function powerpointToPdf(file: File, archive: Archive, progress: Progress): Promise<ConversionResult> {
  const presentation = parseXml(archive['ppt/presentation.xml']);
  const size = first(presentation, 'sldSz');
  const cx = number(size?.getAttribute('cx'), 12_192_000);
  const cy = number(size?.getAttribute('cy'), 6_858_000);
  if (cx <= 0 || cy <= 0 || cx > 50_000_000 || cy > 50_000_000 || cx / cy > 5 || cy / cx > 5) throw new Error('This presentation has unsupported slide dimensions. Use a standard slide size.');
  const width = Math.min(1280, 1600 * cx / cy);
  const height = width * cy / cx;
  const scale = width / cx;
  const rels = relationships(archive, 'ppt/presentation.xml');
  const slidePaths = descendants(presentation, 'sldId').map(node => rels[node.getAttribute('r:id') ?? '']).filter(Boolean);
  if (!slidePaths.length || slidePaths.length > LIMITS.pages) throw new Error('Choose a presentation containing between 1 and 50 slides.');
  const theme: Record<string, string> = { dk1: '#172033', lt1: '#ffffff', dk2: '#1f2937', lt2: '#f3f4f6', accent1: '#2563eb', accent2: '#ea580c', accent3: '#16a34a', accent4: '#7c3aed', accent5: '#0891b2', accent6: '#db2777', tx1: '#172033', bg1: '#ffffff', tx2: '#1f2937', bg2: '#f3f4f6' };
  const themeBytes = archive['ppt/theme/theme1.xml'];
  if (themeBytes) {
    const colors = first(parseXml(themeBytes), 'clrScheme');
    if (colors) for (const color of Array.from(colors.children)) theme[color.localName] = safeColor(first(color, 'srgbClr')?.getAttribute('val') ?? first(color, 'sysClr')?.getAttribute('lastClr'), theme[color.localName]);
    theme.tx1 = theme.dk1; theme.bg1 = theme.lt1; theme.tx2 = theme.dk2; theme.bg2 = theme.lt2;
  }
  const isolated = await isolatedDocument();
  const warnings = ['PowerPoint uses a simplified browser rendering with positioned text, embedded images, basic shapes and tables. Fonts, theme styles, gradients, cropping and advanced layout may differ. Animations and speaker notes are not included.'];
  let unsupported = false;
  try {
    const slides: HTMLElement[] = [];
    for (const [index, path] of slidePaths.entries()) {
      progress(`Preparing slide ${index + 1} of ${slidePaths.length}…`);
      if (!archive[path]) throw new Error('A presentation slide is missing. Save a fresh copy and try again.');
      const source = parseXml(archive[path]);
      const slideRels = relationships(archive, path);
      const layoutPath = Object.values(slideRels).find(target => /slideLayouts\/[^/]+\.xml$/.test(target));
      const layout = layoutPath && archive[layoutPath] ? parseXml(archive[layoutPath]) : undefined;
      const layoutRels = layoutPath ? relationships(archive, layoutPath) : {};
      const masterPath = Object.values(layoutRels).find(target => /slideMasters\/[^/]+\.xml$/.test(target));
      const master = masterPath && archive[masterPath] ? parseXml(archive[masterPath]) : undefined;
      const masterRels = masterPath ? relationships(archive, masterPath) : {};
      const inheritedShapes = [...(layout ? descendants(layout, 'sp') : []), ...(master ? descendants(master, 'sp') : [])];
      const inheritedShape = (node: Element) => {
        const placeholder = first(node, 'ph');
        if (!placeholder) return undefined;
        return inheritedShapes.find(candidate => {
          const other = first(candidate, 'ph');
          return other && (other.getAttribute('idx') ?? '0') === (placeholder.getAttribute('idx') ?? '0') && (!placeholder.getAttribute('type') || !other.getAttribute('type') || other.getAttribute('type') === placeholder.getAttribute('type'));
        });
      };
      const slide = isolated.doc.createElement('section');
      slide.style.cssText = `position:relative;width:${width}px;height:${height}px;overflow:hidden;background:white;`;
      const background = first(source, 'bgPr') ?? first(layout, 'bgPr') ?? first(master, 'bgPr');
      slide.style.background = fillColor(background, theme, '#ffffff');
      const tree = first(source, 'spTree');
      const draw = (node: Element, parent: HTMLElement, currentScale: number, nodeRels = slideRels, inherit = true) => {
        if (!['sp', 'pic', 'cxnSp', 'graphicFrame', 'grpSp'].includes(node.localName)) return;
        const inherited = inherit ? inheritedShape(node) : undefined;
        const props = child(node, 'spPr') ?? child(node, 'grpSpPr');
        const transform = child(props, 'xfrm') ?? child(node, 'xfrm') ?? child(child(inherited, 'spPr'), 'xfrm');
        const offset = child(transform, 'off');
        const extent = child(transform, 'ext');
        if (!offset || !extent) { unsupported = true; return; }
        const x = number(offset.getAttribute('x')) * currentScale;
        const y = number(offset.getAttribute('y')) * currentScale;
        const w = number(extent.getAttribute('cx')) * currentScale;
        const h = number(extent.getAttribute('cy')) * currentScale;
        if (w < 0 || h < 0 || w > 10_000 || h > 10_000 || Math.abs(x) > 10_000 || Math.abs(y) > 10_000) throw new Error('A slide has unusually large shapes. Save a simpler copy.');
        const box = isolated.doc.createElement('div');
        box.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;overflow:hidden;`;
        const rotation = number(transform?.getAttribute('rot')) / 60_000;
        const flips = `${transform?.getAttribute('flipH') === '1' ? ' scaleX(-1)' : ''}${transform?.getAttribute('flipV') === '1' ? ' scaleY(-1)' : ''}`;
        if (rotation || flips) box.style.transform = `rotate(${rotation}deg)${flips}`;
        box.style.background = fillColor(props, theme);
        const line = child(props, 'ln');
        const lineWidth = number(line?.getAttribute('w'), 12_700);
        if (line && lineWidth > 0 && !child(line, 'noFill')) box.style.border = `${Math.max(1, lineWidth * currentScale)}px solid ${fillColor(line, theme, '#172033')}`;
        const geometry = first(props, 'prstGeom')?.getAttribute('prst');
        if (geometry === 'ellipse') box.style.borderRadius = '50%';
        else if (geometry === 'roundRect') box.style.borderRadius = '12px';
        else if (geometry && !['rect', 'line'].includes(geometry)) unsupported = true;
        parent.append(box);
        if (node.localName === 'grpSp') {
          const childOffset = child(transform, 'chOff');
          const childExtent = child(transform, 'chExt');
          const chW = number(childExtent?.getAttribute('cx'));
          const chH = number(childExtent?.getAttribute('cy'));
          if (chW <= 0 || chH <= 0) { unsupported = true; return; }
          const group = isolated.doc.createElement('div');
          group.style.cssText = `position:absolute;left:${-number(childOffset?.getAttribute('x')) * currentScale}px;top:${-number(childOffset?.getAttribute('y')) * currentScale}px;width:${chW * currentScale}px;height:${chH * currentScale}px;transform-origin:0 0;transform:scale(${w / (chW * currentScale)},${h / (chH * currentScale)});`;
          box.append(group); Array.from(node.children).forEach(item => draw(item, group, currentScale, nodeRels, inherit));
        } else if (node.localName === 'pic') {
          const id = first(node, 'blip')?.getAttribute('r:embed');
          if (!id || !nodeRels[id]) { unsupported = true; return; }
          const image = isolated.doc.createElement('img');
          image.src = dataImage(nodeRels[id], archive);
          image.style.cssText = 'display:block;width:100%;height:100%;object-fit:fill;'; box.append(image);
        } else if (node.localName === 'graphicFrame') {
          const tableSource = first(node, 'tbl');
          if (!tableSource) { unsupported = true; return; }
          const table = isolated.doc.createElement('table');
          table.style.fontSize = `${Math.max(10, 1800 * 127 * currentScale)}px`;
          for (const row of children(tableSource, 'tr')) {
            const tr = isolated.doc.createElement('tr');
            for (const cell of children(row, 'tc')) {
              const td = isolated.doc.createElement('td');
              const content = isolated.doc.createElement('div');
              drawPptxText(cell, content, currentScale, theme);
              td.append(content); tr.append(td);
            }
            table.append(tr);
          }
          box.append(table);
        } else drawPptxText(node, box, currentScale, theme, inherited);
      };
      for (const [inheritedDocument, inheritedRels] of [[master, masterRels], [layout, layoutRels]] as const) {
        const inheritedTree = first(inheritedDocument, 'spTree');
        if (inheritedTree) Array.from(inheritedTree.children).filter(node => !first(node, 'ph')).forEach(node => draw(node, slide, scale, inheritedRels, false));
      }
      if (tree) Array.from(tree.children).forEach(node => draw(node, slide, scale));
      if (slide.querySelectorAll('*').length > 10_000) throw new Error('This slide is too complex for browser conversion.');
      isolated.doc.body.append(slide); slides.push(slide);
      await pause();
    }
    if (unsupported || Object.keys(archive).some(name => /(?:charts|diagrams|media\/.*\.(?:mp[34]|wav|avi))/.test(name))) warnings.push('This presentation contains unsupported shapes, charts, SmartArt, media or inherited placeholders. Those elements may be simplified or absent; compare every slide with the original.');
    return await capturePages(file, slides, progress, warnings, height);
  } finally { isolated.frame.remove(); }
}

function odLength(value: string | null | undefined, fallback = 0) {
  const match = /^(-?[\d.]+)(cm|mm|in|pt|pc|px)?$/.exec(value ?? '');
  if (!match) return fallback;
  return Number(match[1]) * ({ cm: 96 / 2.54, mm: 96 / 25.4, in: 96, pt: 96 / 72, pc: 16, px: 1 }[match[2] || 'px'] ?? 1);
}
function odParagraph(source: Element, doc: Document): HTMLElement {
  const element = doc.createElement(source.localName === 'h' ? 'h2' : 'p');
  const append = (node: Node, parent: HTMLElement) => {
    if (node.nodeType === 3) parent.append(node.textContent ?? '');
    else if (node.nodeType === 1) {
      const childElement = node as Element;
      if (childElement.localName === 's') parent.append(' '.repeat(Math.min(100, number(childElement.getAttribute('text:c'), 1))));
      else if (childElement.localName === 'tab') parent.append('    ');
      else if (childElement.localName === 'line-break') parent.append(doc.createElement('br'));
      else if (!['note', 'annotation', 'frame'].includes(childElement.localName)) Array.from(node.childNodes).forEach(item => append(item, parent));
    }
  };
  Array.from(source.childNodes).forEach(node => append(node, element));
  return element;
}

async function openDocumentToPdf(file: File, archive: Archive, progress: Progress): Promise<ConversionResult> {
  const kind = ext(file.name);
  const source = parseXml(archive['content.xml']);
  const warnings = ['OpenDocument uses a simplified browser layout. Text, basic tables and embedded images are included; fonts, styling, formulas, charts and advanced layout may differ. Review the PDF before sharing.'];
  let omitted = false;
  let cells = 0;
  const styles = archive['styles.xml'] ? parseXml(archive['styles.xml']) : undefined;
  const pageProperties = first(styles, 'page-layout-properties') ?? first(source, 'page-layout-properties');
  const sourceWidth = odLength(pageProperties?.getAttribute('fo:page-width'), kind === 'odp' ? 28 * 96 / 2.54 : 794);
  const sourceHeight = odLength(pageProperties?.getAttribute('fo:page-height'), kind === 'odp' ? 15.75 * 96 / 2.54 : 1123);
  if (sourceWidth < 100 || sourceHeight < 100 || sourceWidth > 2500 || sourceHeight > 3500) throw new Error('This OpenDocument file has unusually large page dimensions. Use a standard page or slide size.');
  const pageWidth = kind === 'odp' ? Math.min(1120, 1600 * sourceWidth / sourceHeight) : sourceWidth;
  const pageHeight = kind === 'odp' ? pageWidth * sourceHeight / sourceWidth : sourceHeight;
  const isolated = await isolatedDocument();
  try {
    const doc = isolated.doc;
    const pages: HTMLElement[] = [];
    const addImage = (node: Element, parent: HTMLElement) => {
      const path = node.getAttribute('xlink:href')?.replace(/^\.\//, '');
      if (!path || path.startsWith('#')) { omitted = true; return; }
      const image = doc.createElement('img'); image.src = dataImage(path, archive); image.style.cssText = 'display:block;max-width:100%;object-fit:contain;'; parent.append(image);
    };
    const appendContent = (node: Element, parent: HTMLElement) => {
      if (node.localName === 'p' || node.localName === 'h') { parent.append(odParagraph(node, doc)); for (const image of descendants(node, 'image')) addImage(image, parent); }
      else if (node.localName === 'image') addImage(node, parent);
      else if (node.localName === 'table') {
        const table = doc.createElement('table'); table.style.tableLayout = 'fixed';
        for (const row of descendants(node, 'table-row')) {
          const repeatRows = Math.max(1, number(row.getAttribute('table:number-rows-repeated'), 1));
          if (repeatRows > 5000) throw new Error('An OpenDocument sheet has too many repeated rows. Remove unused rows first.');
          const tr = doc.createElement('tr');
          for (const cell of Array.from(row.children).filter(item => ['table-cell', 'covered-table-cell'].includes(item.localName))) {
            const repeat = Math.max(1, number(cell.getAttribute('table:number-columns-repeated'), 1));
            const contents = descendants(cell, 'p').map(item => odParagraph(item, doc).textContent ?? '').join('\n') || cell.getAttribute('office:string-value') || cell.getAttribute('office:value') || '';
            if (!contents && repeat > 100) continue;
            if (repeat > 100 || (cells += repeat * repeatRows) > 20_000) throw new Error('This OpenDocument spreadsheet exceeds 100 columns or 20,000 cells. Remove unused cells or split it.');
            for (let column = 0; column < repeat; column++) { const td = doc.createElement('td'); td.textContent = contents; tr.append(td); }
          }
          if (!tr.childNodes.length) continue;
          for (let index = 0; index < repeatRows; index++) table.append(tr.cloneNode(true));
        }
        parent.append(table);
      } else if (['object', 'object-ole', 'chart', 'plugin'].includes(node.localName)) omitted = true;
      else Array.from(node.children).forEach(item => appendContent(item, parent));
    };
    if (kind === 'odp') {
      const slideSources = descendants(source, 'page');
      if (!slideSources.length || slideSources.length > LIMITS.pages) throw new Error('Choose an OpenDocument presentation with 1–50 slides.');
      for (const slideSource of slideSources) {
        const slide = doc.createElement('section'); slide.style.cssText = `position:relative;width:${pageWidth}px;height:${pageHeight}px;overflow:hidden;background:white;`;
        const frames = Array.from(slideSource.children);
        for (const frame of frames) {
          if (!['frame', 'rect', 'ellipse', 'custom-shape'].includes(frame.localName)) { omitted = true; continue; }
          const box = doc.createElement('div');
          const unit = pageWidth / sourceWidth;
          const x = odLength(frame.getAttribute('svg:x')) * unit; const y = odLength(frame.getAttribute('svg:y')) * unit;
          const width = odLength(frame.getAttribute('svg:width'), 400) * unit; const height = odLength(frame.getAttribute('svg:height'), 100) * unit;
          if (Math.abs(x) > 10_000 || Math.abs(y) > 10_000 || width > 10_000 || height > 10_000) throw new Error('This slide contains unusually large drawing objects.');
          box.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${Math.max(1, width)}px;height:${Math.max(1, height)}px;font-size:24px;overflow:hidden;`;
          if (frame.localName === 'ellipse') box.style.borderRadius = '50%';
          appendContent(frame, box); slide.append(box);
        }
        doc.body.append(slide); pages.push(slide);
      }
    } else {
      const page = doc.createElement('section'); page.style.cssText = `width:${pageWidth}px;min-height:${pageHeight}px;padding:64px;font-size:16px;line-height:1.5;background:white;overflow:visible;`;
      const body = first(source, kind === 'ods' ? 'spreadsheet' : 'text');
      if (!body) throw new Error('This OpenDocument file has no readable content.');
      Array.from(body.children).forEach(node => appendContent(node, page));
      if (!(page.textContent?.trim() || page.querySelector('img'))) throw new Error('This OpenDocument file has no supported content to convert.');
      doc.body.append(page); pages.push(page);
    }
    if (doc.body.querySelectorAll('*').length > LIMITS.nodes) throw new Error('This document is too complex. Split it into smaller files.');
    if (omitted) warnings.push('This file contains unsupported drawings, embedded objects or annotations that are omitted from the PDF.');
    return await capturePages(file, pages, progress, warnings, pageHeight);
  } finally { isolated.frame.remove(); }
}

export async function convertOfficeToPdf(file: File, mode: OfficeMode, progress: Progress): Promise<ConversionResult> {
  if (!file.size || file.size > LIMITS.input) throw new Error('Choose a file up to 5 MB (5,000,000 bytes).');
  if (typeof document === 'undefined') throw new Error('Open this converter in a web browser.');
  if (mode === 'text-pdf') return textToPdf(file, progress);
  const kind = ext(file.name) as ArchiveKind;
  const allowed = mode === 'word-pdf' ? ['docx'] : mode === 'powerpoint-pdf' ? ['pptx'] : ['odt', 'odp', 'ods'];
  if (!allowed.includes(kind)) throw new Error(`Choose ${allowed.map(value => `.${value}`).join(', ')}. Older .doc and .ppt files must first be saved as .docx or .pptx.`);
  progress('Checking document contents…');
  const archive = await inspectOfficeArchive(new Uint8Array(await file.arrayBuffer()), kind);
  if (mode === 'word-pdf') return wordToPdf(file, archive, progress);
  if (mode === 'powerpoint-pdf') return powerpointToPdf(file, archive, progress);
  return openDocumentToPdf(file, archive, progress);
}
