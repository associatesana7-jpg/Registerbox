# Offline CA document tools

Implemented in `src/lib/ca-document-tools.ts` (pure parsers/arithmetic), `src/lib/ca-document-extraction.web.ts` (browser file decoding/export), `src/lib/ca-document-content.ts` (crawlable content) and `src/components/website/ca-document-tools.web.tsx` (UI).

## Root integration

- Add metadata `CA_DOCUMENT_TOOLS` to the CA tools catalogue and create routes for `gstr-2b-reconciler`, `bank-statement-to-excel`, `invoice-to-excel`. Render the default component with `{id}`.
- Run `node scripts/prepare-ca-ocr-assets.mjs` before a production web build and during local setup. Add `public/vendor/ca-ocr/` to `.gitignore`. Keep generated files in the built static output.
- Asset preparation downloads exact versions of Tesseract.js 6.0.1, Tesseract.js-core 6.0.0 and English best_int 1.0.0 from pinned package URLs. Every asset has a committed SHA-256 expected digest; changed or incomplete bytes fail the build. No OCR npm dependency is added.
- Permit same-origin script, worker and WebAssembly loading under the existing CSP. OCR does not contact a runtime CDN or upload source images. Validate in the real browser with the final CSP.
- Include `node --test scripts/test-ca-document-tools.mjs` in the CA test script. Expose the existing `readWorkbook` in `file-converter.web.ts` as an exported function; the CA XLSX path dynamically reuses its hardened reader. No package/config/routes/navigation files are changed by this implementation.

## Limits and privacy

Combined source size is 5,000,000 bytes. PDF limit is 30 pages. Selected tables have at most 10,000 data rows and 100 columns. XLSX uses the existing converter's hardened workbook reader: streamed inflation limits, CRC checks, local/central ZIP consistency, duplicate paths, canonical internal relationships, XML entity handling and dense cell allocation. The CA preflight also rejects macros and a declared expanded size above 30 MB. Source formulas are not executed; exported workbook cells are explicit strings to prevent formula injection. Content is rendered with React text nodes. The reader uses PDF.js 6's text/rendering APIs without requesting document JavaScript actions; XFA is disabled.

Images are identified from their bytes with the existing raster inspector before browser decoding. Invalid/oversized headers are rejected. Decoded OCR work is resized to at most 8 million pixels and 5,000 pixels on each side, with geometry returned in resized canvas coordinates. OCR is printed-English only. Worker creation and recognition have timeouts; workers and canvases are released. The English model can make character/digit/layout errors and the UI requires review.

## Reconciliation

GSTR-2B is an input to eligibility review, not an eligibility decision. The tool compares supplied document tables by full supplier GSTIN, number and normalized document type. Number normalization removes spaces and case differences but retains punctuation to avoid unsafe matches. Date and five monetary fields are checked separately. Notes stay REVIEW. Unknown/missing types and malformed fields cannot be MATCHED. Duplicates and one-sided records retain all source validation reasons. Results are a working paper; no protected portal fetch, preparation, payment or filing occurs.

## Bank conversion

PDF columns are inferred from geometry; ruled grids use the shared pure PDF grid helper. The user can choose a table, header row and edit TSV before mapping. Checks use `previous reported balance - debit + credit`. The previous reported balance is retained after a discrepancy; an error is not silently propagated as a corrected balance. Omitted and invalid opening balances are distinct. Separate debit/credit values must be non-negative. Signed single movements and DR/CR suffixes are supported; conflicting signs are flagged. Reversed chronological statements must be reordered by the user before checking. This is not a cash-book reconciliation.

## Invoice extraction

Every source file is treated as one invoice. Suggested fields require explicit labels; malformed full amount tokens and negative totals are not guessed or made positive. Standard GSTINs require a complete token and checksum; party roles are not guessed. Original extraction warnings persist even after field edits. The workbook includes manual-review state and raw text.

PDF selectable-text mode cannot read embedded image regions. The OCR switch explicitly reads every page, including mixed text/scanned pages; it never skips OCR just because some text is selectable.

## Shared OCR API

`recognizeImageForTable(file: Blob, progress?): Promise<{text, words, width, height, confidence}>` returns OCR words with `{text,left,top,right,bottom,confidence}`. Coordinates refer to the returned decoded/resized dimensions. `recognizeCanvasForTable(canvas, progress?)` avoids re-decoding an existing canvas and requires it to be at most 8 MP and 5,000 pixels on each side. A browser integration can reconstruct image tables from the word geometry without reusing heuristic financial labels.
