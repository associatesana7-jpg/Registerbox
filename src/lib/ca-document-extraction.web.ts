/** Same-origin document decoding. Source documents never leave the browser. */
import { CA_DOCUMENT_LIMITS, parseDelimited, type StringTable } from './ca-document-tools';
import { extractRuledPdfTables, pdfRulesFromOperators, type PositionedPdfText } from './pdf-table-layout';
import { inspectConverterRaster } from './converter-images.web';
export type DocumentProgress = (message: string) => void;
export type OcrWord = { text: string; left: number; top: number; right: number; bottom: number; confidence: number };
export type OcrTableImage = { text: string; words: OcrWord[]; width: number; height: number; confidence: number };
type OcrNode = { text?: string; confidence?: number; bbox?: { x0: number; y0: number; x1: number; y1: number }; paragraphs?: OcrNode[]; lines?: OcrNode[]; words?: OcrNode[] };
type OcrWorker = { recognize: (image: HTMLCanvasElement, options: Record<string, unknown>, output: { text: boolean; blocks: boolean }) => Promise<{ data: OcrNode & { blocks?: OcrNode[] } }>; terminate: () => Promise<unknown>; setParameters: (params: Record<string, string>) => Promise<unknown> };
type OcrApi = { createWorker: (language: string, mode: number, options: Record<string, unknown>) => Promise<OcrWorker> };
declare global { interface Window { Tesseract?: OcrApi } }
const OCR_ROOT = '/vendor/ca-ocr';
let ocrScript: Promise<OcrApi> | undefined;

function loadOcr(): Promise<OcrApi> {
  if (typeof window === 'undefined') return Promise.reject(new Error('OCR requires a browser.'));
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  ocrScript ??= new Promise<OcrApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = OCR_ROOT + '/tesseract.min.js';
    script.async = true;
    script.integrity = 'sha256-EP/3hIQGd1nEMCigKnLXbQuQ6xcwK7I7WKnsVBC8kos=';
    const timeout = window.setTimeout(() => { script.remove(); ocrScript = undefined; reject(new Error('The local OCR engine could not load. Try again.')); }, 30_000);
    script.onload = () => { window.clearTimeout(timeout); if (window.Tesseract) resolve(window.Tesseract); else { ocrScript = undefined; reject(new Error('The local OCR engine is unavailable.')); } };
    script.onerror = () => { window.clearTimeout(timeout); script.remove(); ocrScript = undefined; reject(new Error('OCR assets are unavailable. The site owner must prepare the local OCR assets.')); };
    document.head.appendChild(script);
  });
  return ocrScript;
}

export function collectOcrWords(blocks: OcrNode[]): OcrWord[] {
  const words: OcrWord[] = [];
  for (const block of blocks) for (const paragraph of block.paragraphs || []) for (const line of paragraph.lines || []) for (const word of line.words || []) {
    if (!word.text?.trim() || !word.bbox) continue;
    const { x0, y0, x1, y1 } = word.bbox;
    if (![x0,y0,x1,y1].every(Number.isFinite) || x1 <= x0 || y1 <= y0) continue;
    words.push({ text: word.text, left: x0, top: y0, right: x1, bottom: y1, confidence: word.confidence || 0 });
    if (words.length > 30_000) throw new Error('The image contains too many OCR words. Split it into smaller images.');
  }
  return words;
}

export async function recognizeCanvasForTable(canvas: HTMLCanvasElement, progress: DocumentProgress = () => {}): Promise<OcrTableImage> {
  if (!canvas.width || !canvas.height || canvas.width * canvas.height > 8_000_000 || canvas.width > 5000 || canvas.height > 5000) throw new Error('OCR requires a canvas at most 8 million pixels and 5,000 pixels on each side.');
  progress('Loading local English OCR…');
  const api = await loadOcr();
  const creation = api.createWorker('eng', 1, {
    workerPath: OCR_ROOT + '/worker.min.js', corePath: OCR_ROOT, langPath: OCR_ROOT,
    workerBlobURL: false, cacheMethod: 'none', gzip: true,
    logger: (event: { status?: string; progress?: number }) => { if (event.status === 'recognizing text') progress(`Reading text on your device… ${Math.round((event.progress || 0) * 100)}%`); },
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  let worker: OcrWorker | undefined; let expired = false;
  try {
    worker = await Promise.race([creation, new Promise<never>((_, reject) => { timer = setTimeout(() => { expired = true; reject(new Error('The OCR engine took too long to start. Try again.')); }, 120_000); })]);
    if (timer) clearTimeout(timer);
    await worker.setParameters({ preserve_interword_spaces: '1', user_defined_dpi: '150', tessedit_pageseg_mode: '3' });
    const result = await Promise.race([
      worker.recognize(canvas, {}, { text: true, blocks: true }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('OCR took too long. Try a smaller, clearer image.')), 120_000); }),
    ]);
    const text = result.data.text || '';
    if (text.length > 1_000_000) throw new Error('OCR text exceeds the supported size. Split the image.');
    return { text, words: collectOcrWords(result.data.blocks || []), width: canvas.width, height: canvas.height, confidence: result.data.confidence || 0 };
  } finally { if (timer) clearTimeout(timer); if (worker) await worker.terminate(); else if (expired) void creation.then(lateWorker => lateWorker.terminate()).catch(() => {}); }
}

/** Geometry is in decoded image pixels; preserves every OCR word for table reconstruction. */
export async function recognizeImageForTable(file: Blob, progress: DocumentProgress = () => {}): Promise<OcrTableImage> {
  if (file.size > 5_000_000 || !file.size) throw new Error('Choose a non-empty image no larger than 5 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const info = inspectConverterRaster(bytes);
  if (!info || info.kind === 'gif') throw new Error('Use a genuine JPG, PNG or WebP image. Renaming a file does not convert its format.');
  const ratio = Math.min(1, Math.sqrt(8_000_000 / (info.width * info.height)), 5000 / Math.max(info.width, info.height));
  const width = Math.max(1, Math.floor(info.width * ratio)), height = Math.max(1, Math.floor(info.height * ratio));
  const image = await createImageBitmap(new Blob([bytes as BlobPart], { type: `image/${info.kind}` }), { resizeWidth: width, resizeHeight: height, imageOrientation: 'from-image' });
  const canvas = document.createElement('canvas');
  try {
    canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser cannot decode this image.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0);
    return await recognizeCanvasForTable(canvas, progress);
  } finally { image.close(); canvas.width = 0; canvas.height = 0; }
}

export type DocumentSheet = { name: string; rows: StringTable };
export type DocumentExtraction = { text: string; sheets: DocumentSheet[]; warnings: string[] };
export function validateDocumentFiles(files: readonly File[], allowed: readonly string[]): void {
  if (!files.length) throw new Error('Choose a file first.');
  if (files.length > 20) throw new Error('Add at most 20 files at once.');
  if (files.reduce((total, file) => total + file.size, 0) > CA_DOCUMENT_LIMITS.bytes) throw new Error('Files must be no larger than 5 MB combined.');
  for (const file of files) {
    const extension = file.name.split('.').at(-1)?.toLowerCase() || '';
    if (!file.size || !allowed.includes(extension)) throw new Error(`Use ${allowed.join(', ').toUpperCase()} files with some content.`);
  }
}
function checkTable(rows: StringTable): StringTable {
  if (rows.length > CA_DOCUMENT_LIMITS.rows + 1 || rows.some(row => row.length > CA_DOCUMENT_LIMITS.columns)) throw new Error('Use no more than 10,000 rows and 100 columns per sheet.');
  if (rows.flat().reduce((count, cell) => count + cell.length, 0) > CA_DOCUMENT_LIMITS.text) throw new Error('The extracted table exceeds 2 million characters.');
  return rows;
}
export function inspectCaWorkbookArchive(bytes: Uint8Array): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 22 || view.getUint32(0, true) !== 0x04034b50) throw new Error('The file is not a genuine XLSX workbook.');
  let end = bytes.length - 22;
  for (; end >= Math.max(0, bytes.length - 65557); end--) if (view.getUint32(end, true) === 0x06054b50) break;
  if (end < Math.max(0, bytes.length - 65557)) throw new Error('The workbook archive is invalid.');
  const count = view.getUint16(end + 10, true), offset = view.getUint32(end + 16, true);
  if (count > 2000 || count === 65535 || offset >= end) throw new Error('The workbook archive is too large or unsupported.');
  let position = offset, expanded = 0;
  for (let i = 0; i < count; i++) {
    if (position + 46 > end || view.getUint32(position, true) !== 0x02014b50) throw new Error('Invalid workbook archive directory.');
    if (view.getUint16(position + 8, true) & 1) throw new Error('Encrypted workbooks are not supported.');
    expanded += view.getUint32(position + 24, true);
    if (expanded > 30_000_000) throw new Error('This workbook expands to over 30 MB. Split it first.');
    const size = view.getUint16(position + 28, true), extra = view.getUint16(position + 30, true), comment = view.getUint16(position + 32, true);
    const name = new TextDecoder().decode(bytes.subarray(position + 46, position + 46 + size));
    if (name.includes('..') || /vbaProject|activeX|\.bin$/i.test(name)) throw new Error('Use a standard XLSX workbook without macros or embedded executable objects.');
    position += 46 + size + extra + comment;
  }
}
export async function readDocumentSpreadsheet(file: File): Promise<DocumentSheet[]> {
  validateDocumentFiles([file], ['csv','tsv','xlsx']);
  if (!/\.xlsx$/i.test(file.name)) return [{ name: file.name, rows: checkTable(parseDelimited(await file.text())) }];
  const bytes = new Uint8Array(await file.arrayBuffer()); inspectCaWorkbookArchive(bytes);
  // Reuse the converter's streamed ZIP+CRC validation, canonical relationship
  // resolver and dense-cell XML sanitizer before read-excel-file sees the data.
  // Dynamic loading avoids an eager cycle with the converter's image OCR path.
  const { readWorkbook } = await import('./file-converter.web');
  const workbook = await readWorkbook(file);
  return workbook.map(sheet => ({ name: sheet.name, rows: checkTable(sheet.rows) }));
}
function positionedRows(items: readonly PositionedPdfText[]): StringTable {
  const lines: { y:number; height:number; items:PositionedPdfText[] }[] = [];
  for (const item of [...items].filter(item => item.str.trim()).sort((a,b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4])) {
    const last = lines.at(-1); const height = Math.abs(item.height) || 10;
    if (last && Math.abs(last.y - item.transform[5]) <= Math.max(2, Math.min(last.height, height) * .4)) last.items.push(item);
    else lines.push({ y:item.transform[5],height,items:[item] });
  }
  return lines.map(line => {
    const row:string[]=[]; let cell='',end=-Infinity;
    for(const item of line.items.sort((a,b)=>a.transform[4]-b.transform[4])) {
      const gap=item.transform[4]-end;
      if(cell && gap>Math.max(12,line.height*1.2)){row.push(cell);cell='';}
      if(cell && gap>1)cell+=' ';cell+=item.str;end=item.transform[4]+item.width;
    }
    if(cell)row.push(cell);return row;
  });
}
export function ocrWordsToRows(words: readonly OcrWord[]): StringTable {
  return positionedRows(words.map(word => ({str:word.text,transform:[1,0,0,1,word.left,-word.top],width:word.right-word.left,height:word.bottom-word.top})));
}
export async function extractDocument(file:File, options:{ocr:boolean}, progress:DocumentProgress=()=>{}):Promise<DocumentExtraction> {
  validateDocumentFiles([file], ['pdf','png','jpg','jpeg','webp','csv','tsv','xlsx']);
  if (/\.(?:csv|tsv|xlsx)$/i.test(file.name)) { const sheets=await readDocumentSpreadsheet(file);return {sheets,text:sheets.map(sheet=>sheet.rows.map(row=>row.join('\t')).join('\n')).join('\n'),warnings:['Spreadsheet formulas are not executed. Review imported cached values and dates.']}; }
  if (!/\.pdf$/i.test(file.name)) {
    const result=await recognizeImageForTable(file,progress);
    return {text:result.text,sheets:[{name:'OCR image',rows:checkTable(ocrWordsToRows(result.words))}],warnings:[`English OCR confidence: ${Math.round(result.confidence)}%. OCR can misread letters, digits and columns; check every extracted value.`]};
  }
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw new Error('The file is not a genuine PDF.');
  const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc='/vendor/pdfjs/pdf.worker.min.mjs';
  const task=pdfjs.getDocument({data:bytes,cMapUrl:'/vendor/pdfjs/cmaps/',cMapPacked:true,iccUrl:'/vendor/pdfjs/iccs/',standardFontDataUrl:'/vendor/pdfjs/standard_fonts/',wasmUrl:'/vendor/pdfjs/wasm/',enableXfa:false,stopAtErrors:true,maxImageSize:24_000_000});
  const sheets:DocumentSheet[]=[],text:string[]=[],warnings:string[]=[];
  try {
    const pdf=await task.promise;if(pdf.numPages>CA_DOCUMENT_LIMITS.pdfPages)throw new Error('Use a PDF with at most 30 pages. Split larger files.');
    for(let index=1;index<=pdf.numPages;index++) {
      progress(`Reading PDF page ${index} of ${pdf.numPages}…`);const page=await pdf.getPage(index);
      try {
        if(options.ocr) {
          // OCR EVERY page, including pages containing both selectable text and scanned regions.
          const base=page.getViewport({scale:1}),scale=Math.min(2,Math.sqrt(7_900_000/(base.width*base.height)),4990/Math.max(base.width,base.height)),viewport=page.getViewport({scale});
          const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
          try {const context=canvas.getContext('2d');if(!context)throw new Error('Canvas is unavailable.');await page.render({canvas,canvasContext:context,viewport}).promise;const result=await recognizeCanvasForTable(canvas,message=>progress(`Page ${index}/${pdf.numPages}: ${message}`));text.push(result.text);sheets.push({name:`Page ${index} OCR`,rows:checkTable(ocrWordsToRows(result.words))});if(!result.text.trim())warnings.push(`Page ${index}: OCR found no text.`);}finally{canvas.width=0;canvas.height=0;}
        } else {
          const content=await page.getTextContent();const items=content.items.filter((item):item is import('pdfjs-dist/types/src/display/api').TextItem=>'str'in item);
          const rows=positionedRows(items);text.push(rows.map(row=>row.join(' ')).join('\n'));
          let grids:ReturnType<typeof extractRuledPdfTables>=[];try{grids=extractRuledPdfTables(items,pdfRulesFromOperators(await page.getOperatorList(),pdfjs.OPS));}catch{/* Text-position fallback is disclosed. */}
          if(grids.length)grids.forEach((grid,i)=>sheets.push({name:`Page ${index} table ${i+1}`,rows:checkTable(grid.rows)}));
          else {sheets.push({name:`Page ${index}`,rows:checkTable(rows)});warnings.push(`Page ${index}: columns are estimated from text positions.`);}
          if(!rows.length)warnings.push(`Page ${index}: no selectable text. Enable OCR for all pages to inspect scanned content.`);
        }
        if(text.join('').length>CA_DOCUMENT_LIMITS.text)throw new Error('The PDF contains over 2 million text characters. Split it.');
      }finally{page.cleanup();}
    }
    if(options.ocr)warnings.unshift('English OCR inspected every PDF page, including mixed text/image pages. Check all values and column positions.');
    else warnings.unshift('Selectable text only. Image regions within pages are not read; enable OCR for all pages to inspect those regions.');
    return {text:text.join('\n\n'),sheets,warnings};
  }catch(error){if(error instanceof Error&&error.name==='PasswordException')throw new Error('Unlock a copy of this password-protected PDF first.');throw error;}finally{await task.destroy();}
}
/** Every cell is an explicit string: content beginning =,+,-,@ is never a formula. */
export async function downloadDocumentWorkbook(sheets:DocumentSheet[], filename:string):Promise<void> {
  for (const sheet of sheets) for (const row of sheet.rows) for (const value of row) if (value.length > 32_000) throw new Error('A cell contains over 32,000 characters. Shorten that field or split the source file before exporting to Excel.');
  const {default:writeExcelFile}=await import('write-excel-file/browser');
  const blob=await writeExcelFile(sheets.map((sheet,index)=>({sheet:`${index+1} ${sheet.name}`.replace(/[\\/\[\]:?*]/g,' ').slice(0,31),data:sheet.rows.map(row=>row.map(value=>({type:String,value}))),columns:Array.from({length:Math.min(100,Math.max(1,...sheet.rows.map(row=>row.length)))},()=>({width:24}))}))).toBlob();
  const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=filename.endsWith('.xlsx')?filename:filename+'.xlsx';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),30_000);
}
