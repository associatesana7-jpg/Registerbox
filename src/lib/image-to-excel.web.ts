import { inspectConverterRaster } from './converter-images.web';
import { imageWordsToTables, rasterTableRules } from './image-table-layout';
import type { ConversionResult } from './file-converter.web';

/** OCR and raster table analysis are local; only pinned same-origin engine assets are loaded. */
export async function imageToExcel(file: File, progress: (message: string) => void): Promise<ConversionResult> {
  if (!file.size || file.size > 5000000) throw new Error('Choose one image up to 5 MB (5,000,000 bytes).');
  const bytes = new Uint8Array(await file.arrayBuffer()), info = inspectConverterRaster(bytes);
  const ext = file.name.split('.').pop()?.toLowerCase(), expected = ext === 'jpg' ? 'jpeg' : ext;
  if (!info || info.kind === 'gif' || info.kind !== expected) throw new Error('Choose a genuine JPG, PNG or WebP image. The image contents must match the filename.');
  let bitmap: ImageBitmap | undefined;
  const canvas = document.createElement('canvas');
  try {
    progress('Preparing a clear image for local OCR…');
    bitmap = await createImageBitmap(new Blob([bytes], { type: `image/${info.kind}` }));
    if (bitmap.width * bitmap.height > 24000000) throw new Error('Resize this image to 24 megapixels or less.');
    const scale = Math.min(1, Math.sqrt(8000000 / (bitmap.width * bitmap.height)), 5000 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('This browser cannot prepare the image. Try a recent browser.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const rules = rasterTableRules(pixels.data, canvas.width, canvas.height);
    const { recognizeCanvasForTable } = await import('./ca-document-extraction.web');
    const ocr = await recognizeCanvasForTable(canvas, progress);
    if (!ocr.words.length) throw new Error('No readable printed text was found. Use a sharp, upright image and crop closely around one table.');
    // The decoder can apply a further safety resize; keep geometry in the same coordinate system.
    const sx = ocr.width / canvas.width, sy = ocr.height / canvas.height;
    const scaledRules = rules.map(rule => ({ x1: rule.x1 * sx, x2: rule.x2 * sx, y1: rule.y1 * sy, y2: rule.y2 * sy }));
    const layout = imageWordsToTables(ocr.words, ocr.height, scaledRules);
    if (!layout.tables.some(rows => rows.length && rows.some(row => row.some(value => value.trim())))) throw new Error('No usable rows were extracted. A blank spreadsheet has not been created.');
    let cells = 0;
    for (const rows of layout.tables) {
      for (const row of rows) { cells += row.length; if (row.length > 100 || cells > 20000 || row.some(value => value.length > 10000)) throw new Error('The extracted image table exceeds the supported size. Crop a smaller table.'); }
    }
    const sheets = layout.tables.map((rows, index) => ({ sheet: `Table ${index + 1}`, columns: Array.from({ length: Math.max(...rows.map(row => row.length)) }, (_, c) => ({ width: Math.min(40, Math.max(10, ...rows.map(row => Math.min(38, row[c]?.length || 0) + 2))) })), data: rows.map(row => row.map(value => ({ type: String, value, wrap: true }))) }));
    // Preserve the recognizer's complete text as a second reference, including text outside a grid.
    sheets.push({ sheet: 'OCR text', columns: [{ width: 80 }], data: ocr.text.split(/\r?\n/).filter(Boolean).map(value => [{ type: String, value, wrap: true }]) });
    const { default: writeExcelFile } = await import('write-excel-file/browser');
    progress('Creating your Excel file…');
    const blob = await writeExcelFile(sheets).toBlob();
    if (blob.size > 100000000) throw new Error('The output is too large. Crop a smaller table.');
    const tablePreview = layout.tables.map((rows, index) => ({ sheet: `Table ${index + 1}`, rows: rows.slice(0, 6), totalRows: rows.length, columns: Math.max(...rows.map(row => row.length)) }));
    return {
      blob, filename: `${file.name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').slice(0, 100) || 'image'}-extracted.xlsx`, tablePreview,
      summary: `Image text extracted: ${tablePreview.map(p => `${p.totalRows} rows × ${p.columns} columns`).join('; ')}. Check the preview and compare amounts with the image.`,
      warnings: [
        layout.method === 'borders' ? 'Visible image table borders were used to align OCR words into cells.' : 'No clear grid was found. Columns were estimated from spacing; crop tightly around a single table for a better result.',
        `${layout.lowConfidenceWords} word${layout.lowConfidenceWords === 1 ? '' : 's'} had low OCR confidence. Review names, decimal points, signs and every amount before using the spreadsheet.`,
        'Supports clear printed English text and numbers. Handwriting, blur, rotated photos and other scripts can be inaccurate. Original Excel formulas and cell types are not recovered; values are stored as text.',
        'The complete recognised text is kept on the OCR text sheet. The image and extracted text stay on your device.',
      ],
    };
  } finally { bitmap?.close(); canvas.width = 0; canvas.height = 0; }
}
