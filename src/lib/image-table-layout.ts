import { extractRuledPdfTables, type PdfRule, type PositionedPdfText } from './pdf-table-layout';
export type OcrTableWord = { text: string; left: number; top: number; right: number; bottom: number; confidence: number };

/** Detect long thin rules, not character strokes or large shaded regions. */
export function rasterTableRules(data: Uint8ClampedArray, width: number, height: number): PdfRule[] {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || width * height > 8000000 || data.length !== width * height * 4) throw new Error('Invalid or oversized table image.');
  const dark = (x: number, y: number) => {
    const i = (y * width + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
    return data[i + 3] > 128 && (r * .2126 + g * .7152 + b * .0722) < 235 && Math.max(r, g, b) - Math.min(r, g, b) < 110;
  };
  const xs: { at: number; start: number; end: number }[] = [], ys: { at: number; start: number; end: number }[] = [];
  function scan(length: number, depth: number, vertical: boolean, output: typeof xs) {
    let bandStart = -1; let bests: { at: number; start: number; end: number; coverage: number }[] = [];
    const step = Math.max(1, Math.floor(depth / 1400));
    function flush() {
      if (bandStart >= 0 && bests.length <= Math.max(6, length * .006)) {
        const best = bests.reduce((a, b) => a.coverage > b.coverage ? a : b);
        output.push({ at: best.at, start: best.start, end: best.end });
      }
      bandStart = -1; bests = [];
    }
    for (let at = 0; at <= length; at++) {
      let longest = 0, start = 0, end = 0, currentStart = 0, gap = 0;
      if (at < length) for (let pos = 0; pos < depth; pos += step) {
        const ink = vertical ? dark(at, pos) : dark(pos, at);
        if (ink) { gap = 0; if (pos - currentStart > longest) { longest = pos - currentStart; start = currentStart; end = pos; } }
        else if (++gap > 2) currentStart = pos;
      }
      if (longest >= depth * .4) { if (bandStart < 0) bandStart = at; bests.push({ at, start, end, coverage: longest }); }
      else flush();
    }
  }
  scan(width, height, true, xs); scan(height, width, false, ys);
  if (xs.length < 3 || ys.length < 3 || xs.length > 101 || ys.length > 1001) return [];
  return [...xs.map(l => ({ x1: l.at, y1: height - l.end, x2: l.at, y2: height - l.start })), ...ys.map(l => ({ x1: l.start, y1: height - l.at, x2: l.end, y2: height - l.at }))];
}

export function imageWordsToTables(words: readonly OcrTableWord[], imageHeight: number, rules: readonly PdfRule[]) {
  if (words.length > 20000) throw new Error('This image contains too many words. Crop it to one table and try again.');
  const valid = words.filter(w => w.text.trim() && [w.left, w.top, w.right, w.bottom].every(Number.isFinite) && w.left >= 0 && w.top >= 0 && w.right > w.left && w.bottom > w.top);
  const chunks: PositionedPdfText[] = valid.map(w => ({ str: w.text, width: w.right - w.left, height: w.bottom - w.top, transform: [w.bottom - w.top, 0, 0, w.bottom - w.top, w.left, imageHeight - w.bottom] }));
  const grids = extractRuledPdfTables(chunks, rules);
  if (grids.length) return { tables: grids.map(grid => grid.rows), method: 'borders' as const, lowConfidenceWords: valid.filter(w => w.confidence < 70).length };
  // Without a visible grid, use persistent vertical whitespace across OCR lines.
  const lines: { top: number; bottom: number; words: OcrTableWord[] }[] = [];
  for (const word of [...valid].sort((a, b) => (a.top + a.bottom) / 2 - (b.top + b.bottom) / 2 || a.left - b.left)) {
    const line = lines.slice(-3).find(l => Math.min(l.bottom, word.bottom) - Math.max(l.top, word.top) > Math.min(l.bottom - l.top, word.bottom - word.top) * .45);
    if (line) { line.words.push(word); line.top = Math.min(line.top, word.top); line.bottom = Math.max(line.bottom, word.bottom); }
    else lines.push({ top: word.top, bottom: word.bottom, words: [word] });
  }
  if (!lines.length) throw new Error('No readable text was found. Use a clear, upright image with printed text and crop closely around the table.');
  const medianHeight = [...valid].map(w => w.bottom - w.top).sort((a, b) => a - b)[Math.floor(valid.length / 2)] || 12;
  const gaps = lines.flatMap(line => {
    const ordered = line.words.sort((a, b) => a.left - b.left);
    return ordered.slice(1).map((w, i) => ({ left: ordered[i].right, right: w.left })).filter(g => g.right - g.left >= medianHeight * 1.7);
  });
  const candidates = [...new Set(gaps.map(g => Math.round((g.left + g.right) / 2)))].map(x => ({ x, votes: gaps.filter(g => g.left < x && g.right > x).length }));
  const boundaries: number[] = [];
  for (const candidate of candidates.sort((a, b) => b.votes - a.votes)) {
    if (candidate.votes < Math.max(2, lines.length * .35)) continue;
    if (lines.some(line => line.words.some(w => w.left < candidate.x && w.right > candidate.x))) continue;
    if (!boundaries.some(x => Math.abs(candidate.x - x) < medianHeight * 2)) boundaries.push(candidate.x);
  }
  boundaries.sort((a, b) => a - b);
  if (boundaries.length >= 100) throw new Error('Too many possible columns. Crop one table with clear column spacing and try again.');
  const rows = lines.map(line => {
    const row = Array.from({ length: boundaries.length + 1 }, () => '');
    for (const word of line.words.sort((a, b) => a.left - b.left)) { const center = (word.left + word.right) / 2, column = boundaries.filter(x => center > x).length; row[column] += `${row[column] ? ' ' : ''}${word.text}`; }
    return row;
  });
  if (rows.length * rows[0].length > 20000) throw new Error('This image exceeds the extracted-cell limit. Crop a smaller table.');
  return { tables: [rows], method: 'spacing' as const, lowConfidenceWords: valid.filter(w => w.confidence < 70).length };
}
