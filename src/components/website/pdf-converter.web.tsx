import { Link } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { convertFiles, MAX_CONVERSION_BYTES, validateConversionFiles, type ConversionMode, type ConversionResult } from '@/lib/file-converter.web';
import { createConverterThumbnail } from '@/lib/converter-images.web';
import { WebBrand } from './brand.web';
import { SiteFooter } from './footer.web';
import { Seo, siteUrl } from './seo.web';
import { converterFaqs, converterFormats, converterReviewedDate, converterSteps } from './pdf-converter-content';
import './pdf-converter.css';

const path = '/tools/pdf-converter';
const description = 'Free PDF converter for Word, Excel, PowerPoint and images. Convert files up to 5 MB in your browser, or export PDF to DOCX, XLSX, PPTX, PNG and TXT. No login.';
const canonicalUrl = `${siteUrl}${path}`;
const converterSchema = [
  {
    '@type': 'WebApplication', '@id': `${canonicalUrl}#converter`, name: 'RegisterBox Free PDF Converter', url: canonicalUrl, description,
    applicationCategory: 'UtilitiesApplication', operatingSystem: 'Web', browserRequirements: 'Modern browser with JavaScript enabled',
    isAccessibleForFree: true, offers: { '@type': 'Offer', price: 0, priceCurrency: 'INR' }, publisher: { '@id': `${siteUrl}/#organization` },
    featureList: converterFormats.map(item => item.name),
  },
  {
    '@type': 'WebPage', '@id': `${canonicalUrl}#webpage`, url: canonicalUrl, name: 'Free PDF Converter — Word, Excel, PowerPoint & Images', description,
    inLanguage: 'en', dateModified: converterReviewedDate, lastReviewed: converterReviewedDate, author: { '@id': `${siteUrl}/#organization` },
    about: { '@id': `${canonicalUrl}#converter` }, mainEntity: { '@id': `${canonicalUrl}#converter` }, breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` },
  },
  {
    '@type': 'BreadcrumbList', '@id': `${canonicalUrl}#breadcrumb`, itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Free PDF converter', item: canonicalUrl },
    ],
  },
  {
    '@type': 'FAQPage', '@id': `${canonicalUrl}#converter-faq`, isPartOf: { '@id': `${canonicalUrl}#webpage` },
    mainEntity: converterFaqs.map(([question, answer]) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })),
  },
];
const modes: { id: ConversionMode; title: string; detail: string; badge: string; accept: string; action: string; hint: string }[] = [
  { id: 'images-pdf', title: 'Images to PDF', detail: 'One image or a whole set', badge: 'JPG / PNG / WEBP', accept: '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp', action: 'Convert to PDF', hint: 'JPG, PNG or WebP. Add several images in the order you want.' },
  { id: 'image-excel', title: 'Image to Excel', detail: 'Read printed tables with OCR', badge: 'IMAGE → XLSX', accept: '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp', action: 'Read image to Excel', hint: 'One clear JPG, PNG or WebP up to 5 MB. Printed English and numbers. Crop around a straight, readable table; check every OCR result.' },
  { id: 'excel-pdf', title: 'Excel to PDF', detail: 'Sheets, ready to share', badge: 'XLSX / CSV', accept: '.xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv', action: 'Convert to PDF', hint: 'One XLSX or CSV file. Non-empty worksheets become simple tables.' },
  { id: 'word-pdf', title: 'Word to PDF', detail: 'Documents, ready to send', badge: 'DOCX', accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document', action: 'Convert to PDF', hint: 'One DOCX file. Browser rendering may differ from Word’s print layout.' },
  { id: 'powerpoint-pdf', title: 'PowerPoint to PDF', detail: 'Slides, ready to share', badge: 'PPTX', accept: '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation', action: 'Convert to PDF', hint: 'One PPTX presentation. Static slide content is converted; advanced effects may differ.' },
  { id: 'text-pdf', title: 'Text to PDF', detail: 'Notes into a document', badge: 'TXT / MD / RTF', accept: '.txt,.md,.rtf,text/plain,text/markdown,application/rtf', action: 'Convert to PDF', hint: 'One TXT, Markdown or RTF file, or paste your text. Markdown is rendered as plain text.' },
  { id: 'opendocument-pdf', title: 'OpenDocument to PDF', detail: 'Open formats, made portable', badge: 'ODT / ODP / ODS', accept: '.odt,.odp,.ods,application/vnd.oasis.opendocument.text,application/vnd.oasis.opendocument.presentation,application/vnd.oasis.opendocument.spreadsheet', action: 'Convert to PDF', hint: 'One ODT, ODP or ODS file. Uses a simplified text and image layout.' },
  { id: 'pdf-images', title: 'PDF to images', detail: 'A PNG for every page', badge: 'PDF → PNG', accept: '.pdf,application/pdf', action: 'Convert to images', hint: 'One PDF, up to 50 pages. Multiple pages download together as a ZIP.' },
  { id: 'pdf-excel', title: 'PDF to Excel', detail: 'Extract selectable text', badge: 'PDF → XLSX', accept: '.pdf,application/pdf', action: 'Extract to Excel', hint: 'One text-based PDF, up to 50 pages. Review the extracted rows and columns.' },
  { id: 'pdf-word', title: 'PDF to Word', detail: 'Text you can work with', badge: 'PDF → DOCX', accept: '.pdf,application/pdf', action: 'Extract to Word', hint: 'One text-based PDF, up to 50 pages. Extracts editable text into a simple Word document.' },
  { id: 'pdf-powerpoint', title: 'PDF to PowerPoint', detail: 'One page, one slide', badge: 'PDF → PPTX', accept: '.pdf,application/pdf', action: 'Convert to PowerPoint', hint: 'One PDF, up to 50 pages. Each page becomes a slide image, not editable slide elements.' },
  { id: 'pdf-text', title: 'PDF to text', detail: 'Just the words you need', badge: 'PDF → TXT', accept: '.pdf,application/pdf', action: 'Extract text', hint: 'One text-based PDF, up to 50 pages. Downloads selectable text as a UTF-8 TXT file.' },
];
type Result = { url: string; filename: string; summary: string; size: number; warnings?: string[]; tablePreview?: ConversionResult['tablePreview'] };

function Icon({ name, size = 22 }: { name: 'file' | 'arrow' | 'upload' | 'check' | 'lock' | 'close' | 'download'; size?: number }) {
  const paths = {
    file: 'M14 3H6a1 1 0 0 0-1 1v16h14V8l-5-5Zm0 0v6h5M8 13h8M8 17h5',
    arrow: 'M5 12h14m-6-6 6 6-6 6', upload: 'M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5',
    check: 'm5 12 4 4L19 6', lock: 'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5V10Zm7 4v3',
    close: 'm6 6 12 12M18 6 6 18', download: 'M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4',
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}

function fileSize(size: number) {
  return size >= 1_000_000 ? `${(size / 1_000_000).toFixed(2)} MB` : `${Math.max(1, Math.round(size / 1_000))} KB`;
}

function ImageThumbnail({ file }: { file: File }) {
  const previewImage = useRef<HTMLImageElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    let preview: string | undefined;
    createConverterThumbnail(file).then(blob => {
      if (!live) return;
      preview = URL.createObjectURL(blob);
      if (previewImage.current) previewImage.current.src = preview;
    }).catch(cause => { if (live) setError(cause instanceof Error ? cause.message : 'This image could not be previewed.'); });
    return () => { live = false; if (preview) URL.revokeObjectURL(preview); };
  }, [file]);
  return error ? <span className="rb-converter-preview-error" role="status" title={error}>Preview unavailable</span> : <img ref={previewImage} className="rb-converter-thumbnail" alt={`Preview of ${file.name}`}/>;
}

export default function PdfConverterPage() {
  const [mode, setMode] = useState<ConversionMode>('images-pdf');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [dragging, setDragging] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [table, setTable] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const output = useRef<HTMLDivElement>(null);
  const errorBox = useRef<HTMLDivElement>(null);
  const resultUrl = useRef<string | null>(null);
  const running = useRef(false);
  const mounted = useRef(true);
  const selected = modes.find(item => item.id === mode)!;
  const fromPdf = mode.startsWith('pdf-');
  const textExtraction = ['pdf-excel', 'pdf-word', 'pdf-text', 'image-excel'].includes(mode);
  const format = mode === 'excel-pdf' ? 'XLSX' : mode === 'word-pdf' ? 'DOCX' : mode === 'powerpoint-pdf' ? 'PPTX' : mode === 'text-pdf' ? 'TXT' : mode === 'opendocument-pdf' ? 'ODF' : 'IMG';
  const target = mode === 'pdf-images' ? 'PNG' : mode === 'pdf-excel' || mode === 'image-excel' ? 'XLSX' : mode === 'pdf-word' ? 'DOCX' : mode === 'pdf-powerpoint' ? 'PPTX' : mode === 'pdf-text' ? 'TXT' : 'PDF';
  const downloadLabel = mode === 'pdf-images' ? (result?.filename.endsWith('.zip') ? 'ZIP' : 'PNG') : mode === 'pdf-excel' || mode === 'image-excel' ? 'Excel' : mode === 'pdf-word' ? 'Word' : mode === 'pdf-powerpoint' ? 'PowerPoint' : mode === 'pdf-text' ? 'text' : 'PDF';
  const outputCopy: Record<ConversionMode, string> = {
    'images-pdf': 'Your images, together in one easy-to-share PDF. One image per page.',
    'image-excel': 'Read printed image text into Excel cells with local OCR. Preview the rows and columns and check the numbers before downloading.',
    'excel-pdf': 'A clean, simple table layout, with all non-empty worksheets included.',
    'word-pdf': 'A shareable PDF from your document. Review the layout before sending it on.',
    'powerpoint-pdf': 'Turn static slides into PDF pages. Animations, video and interactive content are not included.',
    'text-pdf': 'A clean, paginated PDF for your notes and text. Rich text uses a simplified layout.',
    'opendocument-pdf': 'Bring text and images from open document formats into a simple PDF layout.',
    'pdf-images': 'Share a single page or save the whole set as PNG images.',
    'pdf-excel': 'Get a workbook from selectable PDF text. Check the extracted columns before using your data.',
    'pdf-word': 'Extract selectable text into an editable Word document. Original page design and images are not restored.',
    'pdf-powerpoint': 'Keep each PDF page’s appearance as an image on its own slide. Text and objects are not separately editable.',
    'pdf-text': 'Get selectable text without page styling. Review reading order in documents with multiple columns.',
  };
  const totalBytes = files.reduce((total, file) => total + file.size, 0);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; if (resultUrl.current) URL.revokeObjectURL(resultUrl.current); };
  }, []);
  useEffect(() => { if (result) output.current?.focus(); }, [result]);
  useEffect(() => { if (error) errorBox.current?.focus(); }, [error]);

  const clearResult = useCallback(() => {
    if (resultUrl.current) URL.revokeObjectURL(resultUrl.current);
    resultUrl.current = null;
    setResult(null);
  }, []);

  function changeMode(next: ConversionMode) {
    if (running.current || next === mode) return;
    let keepFiles = false;
    try { validateConversionFiles(files, next); keepFiles = true; } catch { /* A different source format needs a new selection. */ }
    setMode(next); if (!keepFiles) setFiles([]); setError(''); setTable(''); setPasteOpen(false); clearResult();
    if (input.current) input.current.value = '';
  }

  const addFiles = useCallback((incoming: File[], autoDetect = false) => {
    if (running.current || !incoming.length) return;
    let nextMode = mode;
    if (autoDetect) {
      const extension = incoming[0].name.split('.').pop()?.toLowerCase();
      if (['xlsx', 'csv'].includes(extension || '')) nextMode = 'excel-pdf';
      else if (extension === 'docx') nextMode = 'word-pdf';
      else if (extension === 'pptx') nextMode = 'powerpoint-pdf';
      else if (['txt', 'md', 'rtf'].includes(extension || '')) nextMode = 'text-pdf';
      else if (['odt', 'odp', 'ods'].includes(extension || '')) nextMode = 'opendocument-pdf';
      else if (extension === 'pdf' && !mode.startsWith('pdf-')) nextMode = 'pdf-images';
      else if (['png', 'jpg', 'jpeg', 'webp'].includes(extension || '')) nextMode = mode === 'image-excel' ? 'image-excel' : 'images-pdf';
    }
    const next = nextMode === 'images-pdf' && nextMode === mode ? [...files, ...incoming] : incoming;
    try {
      validateConversionFiles(next, nextMode);
      clearResult(); setFiles(next); setMode(nextMode); setError('');
      if (nextMode !== mode) { setPasteOpen(false); setTable(''); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'This file could not be added. Please try another file.'); }
    if (input.current) input.current.value = '';
  }, [clearResult, files, mode]);

  useEffect(() => {
    const pasteFiles = (event: ClipboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest('textarea,input,[contenteditable="true"]')) return;
      const incoming = Array.from(event.clipboardData?.files || []);
      if (incoming.length) { event.preventDefault(); addFiles(incoming, true); }
    };
    document.addEventListener('paste', pasteFiles);
    return () => document.removeEventListener('paste', pasteFiles);
  }, [addFiles]);

  function dropFiles(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); setDragging(false); addFiles(Array.from(event.dataTransfer.files), true);
  }

  function usePastedTable() {
    if (!table.trim()) { setError(mode === 'text-pdf' ? 'Paste some text first.' : 'Paste a table from Excel or CSV text first.'); return; }
    const plainText = mode === 'text-pdf';
    const nextMode = plainText ? 'text-pdf' : 'excel-pdf';
    const file = new File([table], plainText ? 'pasted-text.txt' : 'pasted-table.csv', { type: plainText ? 'text/plain' : 'text/csv' });
    try {
      validateConversionFiles([file], nextMode);
      clearResult(); setMode(nextMode); setFiles([file]); setError(''); setPasteOpen(false); setTable('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Please check the pasted table.'); }
  }

  async function convert() {
    if (running.current) return;
    running.current = true; setBusy(true); setError(''); clearResult(); setProgress('Preparing your files…');
    try {
      const converted = await convertFiles(files, mode, message => {
        if (!mounted.current) throw new Error('Conversion cancelled.');
        setProgress(message);
      });
      if (!mounted.current) return;
      const url = URL.createObjectURL(converted.blob);
      resultUrl.current = url;
      setResult({ url, filename: converted.filename, summary: converted.summary, size: converted.blob.size, warnings: converted.warnings, tablePreview: converted.tablePreview });
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'Conversion did not finish. Please try a different file.');
    } finally {
      running.current = false;
      if (mounted.current) { setBusy(false); setProgress(''); }
    }
  }

  return <div className="rb-public-page rb-converter">
    <Seo title="Free PDF Converter | Word, Excel, PowerPoint & Images | RegisterBox" description={description} path={path} schema={converterSchema}/>
    <header className="rb-public-header rb-container"><WebBrand/><Link href="/">Back to RegisterBox <span aria-hidden="true">↗</span></Link></header>
    <main className="rb-container rb-converter-main">
      <nav className="rb-converter-breadcrumb" id="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Free PDF converter</span></nav>
      <section className="rb-converter-intro" aria-labelledby="converter-title">
        <div className="rb-converter-eyebrow"><span/> A LITTLE LESS PAPERWORK</div>
        <div className="rb-converter-heading"><h1 id="converter-title">Free PDF<br/><span>converter.</span></h1><div><span className="rb-converter-free">100% free</span><p>A new format. Less paperwork.<br/>Word, Excel, PowerPoint, images and more.</p><div className="rb-converter-promises"><span><Icon name="check" size={15}/> No sign-up</span><span><Icon name="check" size={15}/> No watermark</span><span><Icon name="lock" size={15}/> On your device</span></div></div></div>
        <p className="rb-converter-answer">Convert Word, Excel, PowerPoint, images and text to PDF for free, or turn PDF pages into Word, Excel, PowerPoint, PNG images and plain text. Add source files up to <strong>5 MB total</strong>; conversion happens in your browser, without login or a file upload to a conversion server.</p>
        <div className="rb-converter-intro-links"><a href="#converter-formats">See all 12 conversions <span aria-hidden="true">↓</span></a><a href="#converter-how-to">How to convert a file <span aria-hidden="true">↓</span></a></div>
      </section>

      <section className="rb-converter-workspace" id="converter" aria-label="File converter" data-clarity-mask="true">
        <div className="rb-converter-step"><span>01</span><h2>Choose your conversion</h2><small>5 MB total per conversion</small></div>
        <div className="rb-converter-direction" role="group" aria-label="Conversion direction"><button type="button" aria-pressed={!fromPdf && mode !== 'image-excel'} disabled={busy} onClick={() => changeMode('images-pdf')}>Convert to PDF <span>6 options</span></button><button type="button" aria-pressed={fromPdf} disabled={busy} onClick={() => { if (!fromPdf) changeMode('pdf-images'); }}>Convert from PDF <span>5 options</span></button><button type="button" aria-pressed={mode === 'image-excel'} disabled={busy} onClick={() => changeMode('image-excel')}>Image to Excel <span>Local OCR</span></button></div>
        <div className="rb-converter-modes" role="group" aria-label="Conversion type">{modes.filter(item => mode === 'image-excel' ? item.id === 'image-excel' : item.id !== 'image-excel' && item.id.startsWith('pdf-') === fromPdf).map(item => <button type="button" key={item.id} aria-pressed={mode === item.id} disabled={busy} className={mode === item.id ? 'is-selected' : ''} onClick={() => changeMode(item.id)}><span className="rb-converter-mode-badge">{item.badge}</span><span className="rb-converter-mode-title">{item.title}<Icon name="arrow" size={18}/></span><span className="rb-converter-mode-detail">{item.detail}</span></button>)}</div>
        <div className="rb-converter-body">
          <div className="rb-converter-input">
            <div className="rb-converter-step"><span>02</span><h2>Add your {mode === 'images-pdf' ? 'images' : 'file'}</h2></div>
            <p className="rb-converter-format-hint" id="converter-format-hint">{selected.hint}</p>
            <div className={`rb-converter-dropzone${dragging ? ' is-dragging' : ''}${busy ? ' is-busy' : ''}`} onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }} onDrop={dropFiles}>
              <div className="rb-converter-upload-icon"><Icon name="upload" size={28}/></div>
              <strong>{dragging ? 'Drop your files here' : 'Drop it here. We’ll take it from here.'}</strong>
              <span>or paste a copied image with Ctrl / ⌘ + V</span>
              <label className="rb-converter-choose">{files.length && mode === 'images-pdf' ? 'Add more images' : 'Choose files'}<input ref={input} type="file" accept={modes.map(item => item.accept).join(',')} multiple={mode === 'images-pdf'} disabled={busy} aria-label="Choose files" aria-describedby="converter-format-hint" onChange={event => addFiles(Array.from(event.currentTarget.files || []), true)}/></label>
              <small>Up to 5 MB combined · Files stay on your device</small>
            </div>
            {['excel-pdf', 'text-pdf'].includes(mode) && <button type="button" className="rb-converter-text-button" disabled={busy} aria-expanded={pasteOpen} aria-controls="converter-paste-panel" onClick={() => setPasteOpen(!pasteOpen)}>{pasteOpen ? 'Close text input' : mode === 'text-pdf' ? 'Have your notes copied? Paste text' : 'Copied cells from Excel? Paste a table'} <span aria-hidden="true">{pasteOpen ? '−' : '+'}</span></button>}
            {['excel-pdf', 'text-pdf'].includes(mode) && pasteOpen && <div className="rb-converter-paste" id="converter-paste-panel"><label htmlFor="converter-table">{mode === 'text-pdf' ? 'Paste your text' : 'Paste spreadsheet cells or CSV text'}</label><textarea id="converter-table" rows={6} value={table} maxLength={MAX_CONVERSION_BYTES} disabled={busy} onChange={event => setTable(event.target.value)} placeholder={mode === 'text-pdf' ? 'Your notes, ready for a PDF…' : 'Item\tQuantity\tAmount\nStationery\t2\t500'}/><button type="button" onClick={usePastedTable} disabled={busy || !table.trim()}>{mode === 'text-pdf' ? 'Use this text' : 'Use this table'} <Icon name="arrow" size={17}/></button></div>}
            {!!files.length && <div className="rb-converter-files"><div className="rb-converter-files-heading"><strong>{files.length} {files.length === 1 ? 'file' : 'files'} ready</strong><span>{fileSize(totalBytes)} / 5 MB</span></div><ol>{files.map((file, index) => <li key={`${file.name}-${index}`}><span className="rb-converter-selection-number">{index + 1}</span>{mode === 'images-pdf' || mode === 'image-excel' ? <ImageThumbnail file={file}/> : <span className="rb-converter-file-icon"><Icon name="file" size={19}/></span>}<span className="rb-converter-file-name"><strong>{file.name}</strong><small>{fileSize(file.size)}</small></span>{mode === 'images-pdf' && files.length > 1 && <div className="rb-converter-reorder"><button type="button" disabled={busy || index === 0} aria-label={`Move ${file.name} earlier`} onClick={() => { const next = [...files]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; setFiles(next); clearResult(); }}>↑</button><button type="button" disabled={busy || index === files.length - 1} aria-label={`Move ${file.name} later`} onClick={() => { const next = [...files]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; setFiles(next); clearResult(); }}>↓</button></div>}<button className="rb-converter-remove" type="button" disabled={busy} aria-label={`Remove ${file.name}`} onClick={() => { setFiles(files.filter((_, position) => position !== index)); setError(''); clearResult(); }}><Icon name="close" size={17}/></button></li>)}</ol></div>}
          </div>
          <aside className="rb-converter-output" aria-labelledby="converter-download-title">
            <div className="rb-converter-step"><span>03</span><h2 id="converter-download-title">Make it yours</h2></div>
            <div className="rb-converter-output-visual" aria-hidden="true"><span>{fromPdf ? 'PDF' : format}</span><Icon name="arrow" size={24}/><span>{target}</span></div>
            <h3>{textExtraction ? 'Less retyping. More doing.' : 'Ready for the next step.'}</h3>
            <p>{outputCopy[mode]}</p>
            {textExtraction && <div className="rb-converter-note">{mode === 'image-excel' ? 'Local OCR reads printed English and numbers. Review names, signs and decimal points; blur or handwriting can cause mistakes.' : 'Text-based PDFs only. For a scanned page, convert it to a PNG and choose Image to Excel for local OCR.'}</div>}
            <button type="button" className="rb-button rb-converter-submit" disabled={!files.length || busy} onClick={convert}>{busy ? <><span className="rb-converter-spinner"/> Converting…</> : <>{selected.action}<Icon name="arrow" size={19}/></>}</button>
            <div className="rb-converter-progress" role="status" aria-live="polite">{busy ? progress : !files.length ? 'Add a file to get started.' : 'Free to convert. Free to download.'}</div>
            {error && <div className="rb-converter-error" ref={errorBox} tabIndex={-1} role="alert">{error}</div>}
            {result && <div className="rb-converter-result" ref={output} tabIndex={-1} role="status"><span className="rb-converter-result-check"><Icon name="check"/></span><h3>Your file is ready.</h3><p>{result.summary}</p><small>{result.filename} · {fileSize(result.size)}</small>{result.warnings?.map(warning => <p className="rb-converter-result-warning" key={warning}>{warning}</p>)}{result.tablePreview?.map(table => <details className="rb-converter-table-preview" key={table.sheet} open><summary>{table.sheet}: {table.totalRows} rows × {table.columns} columns</summary><div tabIndex={0} role="region" aria-label={`${table.sheet} extracted cells`}><table><caption>First {table.rows.length} extracted rows, including any header. Scroll sideways to check every column.</caption><tbody>{table.rows.map((row, r) => <tr key={r}>{row.map((value, c) => <td key={c}>{value || <span aria-label="Empty cell">—</span>}</td>)}</tr>)}</tbody></table></div></details>)}<a className="rb-button" href={result.url} download={result.filename}>Download {downloadLabel}<Icon name="download" size={19}/></a><span>Save your download before leaving this page.</span></div>}
          </aside>
        </div>
        <div className="rb-converter-privacy"><Icon name="lock" size={18}/><p><strong>Your files stay with you.</strong> Conversion happens in your browser. Your files are never uploaded to a conversion server.</p></div>
      </section>

      <section className="rb-converter-guide" id="converter-how-to" aria-labelledby="converter-how-to-title"><div className="rb-converter-guide-heading"><div><span className="rb-converter-eyebrow">FROM FILE TO FINISHED</span><h2 id="converter-how-to-title">How to convert a file online.</h2></div><p>Three steps for everyday documents, spreadsheet tables, notes and presentation handouts.</p></div><ol className="rb-converter-how-to">{converterSteps.map((step, index) => <li key={step.title}><span aria-hidden="true">0{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol></section>

      <section className="rb-converter-guide" id="converter-formats" aria-labelledby="converter-formats-title"><div className="rb-converter-guide-heading"><div><span className="rb-converter-eyebrow">THE RIGHT FORMAT FOR THE JOB</span><h2 id="converter-formats-title">What can this free PDF converter do?</h2></div><p>Choose editable text when you need to keep working. Choose page images when you want to keep the page’s appearance.</p></div><div className="rb-converter-format-table" tabIndex={0} role="region" aria-label="Supported file conversions and limitations"><table><caption>12 supported conversions, their output formats and what to review</caption><thead><tr><th scope="col">Conversion</th><th scope="col">Files and output</th><th scope="col">What to expect</th></tr></thead><tbody>{converterFormats.map(item => <tr key={item.id}><th scope="row">{item.name}</th><td><span>{item.input}</span><strong>→ {item.output}</strong></td><td>{item.detail}</td></tr>)}</tbody></table></div><p className="rb-converter-guide-note">PDFs generated from source files use image pages, so their text is not searchable or editable. Legacy DOC, PPT and XLS files must first be saved as DOCX, PPTX and XLSX. Password-protected files are not supported.</p></section>

      <section className="rb-converter-usage" aria-label="Choosing a conversion and handling files"><article><span className="rb-converter-eyebrow">CHOOSE WITH CONFIDENCE</span><h2>For everyday paperwork.</h2><p>Combine receipt images into one PDF, share a spreadsheet as a simple table, prepare presentation handouts, or turn copied notes into a document. For an exact Office print layout, export to PDF from the original Word, Excel or PowerPoint app.</p><p>PDF to Word and PDF to Excel read existing selectable text. Use Image to Excel for a clear screenshot or photograph of a printed English table. For a scanned PDF, first export the page as a PNG, then choose Image to Excel. OCR results need review.</p></article><article><span className="rb-converter-eyebrow">ON YOUR DEVICE</span><h2>Your files stay in your browser.</h2><p>The converter processes file contents locally and creates a download on this device. It does not upload your source files or converted results to RegisterBox or a conversion service.</p><p>Size, page, image and compressed-file checks help limit browser resource use. They are not an antivirus scan or a guarantee of file safety. Use files you trust, review the output and manage downloaded copies on your device.</p><Link href="/privacy">Read our privacy information <span aria-hidden="true">↗</span></Link></article></section>

      <section className="rb-converter-faq" id="converter-faq" aria-labelledby="converter-faq-title"><div><div className="rb-converter-eyebrow">A FEW USEFUL DETAILS</div><h2 id="converter-faq-title">PDF conversion.<br/>Clear answers.</h2><p>Formats, privacy and limits.<br/>No account needed.</p></div><div>{converterFaqs.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
      <p className="rb-converter-reviewed">Written and maintained by <Link href="/contact">RegisterBox</Link> · Reviewed <time dateTime={converterReviewedDate}>28 October 2026</time>. Format support and limits describe this browser tool; review each converted file before use.</p>
      <div className="rb-converter-more"><div><span className="rb-converter-eyebrow">A LITTLE MORE OFF YOUR PLATE</span><h2>Paperwork beyond a PDF?</h2><p>Explore registration and compliance support for your business.</p></div><Link href="/services">Explore services <Icon name="arrow" size={20}/></Link></div>
    </main>
    <SiteFooter/>
  </div>;
}
