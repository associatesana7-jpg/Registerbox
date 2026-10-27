# Free file converter

Public web route: `/tools/pdf-converter`. Visitors do not need an account and do not see the public lead form. The homepage and shared footer link to the tool.

All source files and outputs stay in browser memory. There is no file-upload endpoint, conversion API, storage record, usage meter or payment step. Clearing/changing a conversion revokes its download URL. Download before refreshing or leaving.

## Supported conversions

- JPG/PNG/WebP to PDF (up to 20 images in user-selected order).
- XLSX/CSV to PDF as paginated tables, using saved cell values and repeating the first row.
- Word DOCX and PowerPoint PPTX to PDF using browser rendering.
- TXT/Markdown/RTF to PDF; Markdown is plain text and rich text uses a simplified layout.
- OpenDocument ODT/ODP/ODS to PDF with a simplified layout.
- PDF to PNG (one PNG, or an ordered ZIP for multiple pages).
- PDF to XLSX, DOCX and TXT by extracting selectable text. No OCR, formula recovery or restoration of the original design.
- PDF to PPTX with one raster page image per slide. Slide text and objects are not separately editable.

Older binary DOC/XLS/PPT files must be saved in a supported modern format. Encrypted and macro-enabled files are not supported. Font substitution and complex Office features can change layout; review converted PDFs before sharing.

## Limits and runtime

Each conversion accepts at most **5,000,000 source bytes total**, including every selected image. The output can exceed 5 MB. PDF inputs are limited to 50 pages; the engine also bounds raster pixels, spreadsheet cells, expanded archive size and output size. It rejects files that would exceed those limits instead of silently truncating them.

PDF.js parser assets are served from `/vendor/pdfjs/` on the same origin. `npm install` runs `scripts/prepare-pdf-assets.mjs`, copying the installed worker, character maps, fonts, color profile, WASM decoders and license into the ignored generated public folder. Rerun `npm run prepare:pdf` after changing PDF.js or before exporting from an existing installation. Keep worker/parser versions synchronized. The large parsing and rendering libraries are loaded only when converting.

## File handling and privacy

File extensions are checked alongside file signatures and decoded image dimensions. Thumbnails are generated only after validation. Office archives use a bounded ZIP reader that checks actual expanded bytes, checksums, entry paths, duplicate entries and overlapping data. Spreadsheet limits follow the workbook's real worksheet relationships and populated cells, including nonstandard worksheet paths.

Macro-enabled formats, embedded SVG, XML entity declarations, embedded objects, external resources and CSS resource loads are rejected. Word previews render inside a script-disabled frame with a restrictive content policy. Resource limits also apply to otherwise valid files to reduce memory exhaustion. These controls are not an antivirus scan or a guarantee against every browser or parser vulnerability; keep conversion dependencies updated.

The converter workspace and Word preview carry Clarity masking attributes. The production release also skips Clarity bootstrap on direct converter visits; the existing public analytics allowlist excludes this route. Verify these release integrations when rebasing this feature onto a different website baseline.

## Search content

The initial static HTML includes the supported-format guide, conversion steps, privacy explanation, limitations and answers to common questions. The canonical URL is `https://www.registerbox.in/tools/pdf-converter`; the sitemap, homepage, footer and `llms.txt` link to it. WebApplication, WebPage, BreadcrumbList and FAQPage structured data reflect visible content. This makes the page accessible to crawlers and answer engines; indexing and ranking remain search-engine decisions.

## Security boundaries

File extensions are not trusted on their own: the engine validates signatures, image dimensions and decoded content before conversion. Office archives have bounded entry counts and expanded bytes, consistent ZIP metadata and CRC checks. XML entities, archive traversal paths, macros, embedded active content, external resource relationships, CSS resource loads and embedded SVG are rejected. PDF-derived spreadsheet values remain text rather than executable formulas.

Office rendering runs in a script-disabled iframe with a restrictive content security policy; resulting PDFs use raster pages. The converter route adds security response headers. Converter inputs, filenames, previews and results are masked from Clarity, and direct visits to this route skip Clarity initialization. Browser guards reduce the exposed attack surface; they are not antivirus scanning and do not guarantee that every malformed file or future browser/library flaw is harmless. Keep browser and converter dependencies patched.

## Verification

```bash
npm run prepare:pdf
npm run test:converter
npx expo lint
npx tsc --noEmit
npx expo export --platform web --output-dir /private/tmp/registerbox-pdf-converter-web
python3 scripts/check-public-seo.py /private/tmp/registerbox-pdf-converter-web
```

Browser QA must exercise actual uploads and downloads from the exported website. In particular, Node-only tests do not detect bundler interop problems. The browser engine imports the self-contained pdf-lib ESM distribution to avoid its old nested `tslib` default-export incompatibility with Metro.

The converter test command currently exercises 47 conversion and security cases, including all conversion modes, file boundaries, malformed archives, misleading image types, XML and CSS resource declarations, and unusual workbook relationships.

Publication uses the existing website release workflow. Creating this route locally does not publish it.
