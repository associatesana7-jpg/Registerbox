import { Link, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { TYPING_LANGUAGES, getTypingLanguage } from '@/data/typing-languages';
import { MAX_TYPING_CHARACTERS, countTypingText, getKeyboard, getWordSuggestions, transliterateText } from '@/lib/indian-transliteration';
import { WebBrand } from './brand.web';
import { SiteFooter } from './footer.web';
import { Seo, siteUrl } from './seo.web';
import './indian-language-typing.css';

type TypingMode = 'live' | 'word' | 'passage';
type EditorDocument = { source: string; result: string; languageId?: string };
const toolPath = '/tools/indian-language-typing';
const modes: { id: TypingMode; title: string; description: string }[] = [
  { id: 'live', title: 'As you type', description: 'The result updates with every letter.' },
  { id: 'word', title: 'On space', description: 'Finish a word with a space or punctuation to convert it.' },
  { id: 'passage', title: 'Whole passage', description: 'Paste a passage, then choose Convert text.' },
];
const emojis = ['🙂', '😊', '🙏', '👍', '❤️', '🎉', '✨', '🌸', '✅', '📍', '📅', '💐', '🤝', '☀️', '⭐', '🇮🇳'];
const answers = [
  { question: 'How do I type Kannada using an English keyboard?', answer: 'Choose Kannada and type the sound of the word in English letters. The result appears in Kannada as you type. Use aa for a long vowel, try the spelling alternatives, or insert a letter from the on-screen keyboard. For example, namaskaara produces ನಮಸ್ಕಾರ.' },
  { question: 'Which Indian languages can I type?', answer: 'The tool offers 28 language choices, including Kannada, Hindi, Tamil, Telugu, Marathi, Bengali, Gujarati, Malayalam, Punjabi, Odia and Urdu. Each choice shows the script it uses. Several languages share Devanagari. Kashmiri and Sindhi use Devanagari here; other script variants are not currently offered.' },
  { question: 'Does this translate English sentences?', answer: 'This is phonetic transliteration: it changes the script of the sounds you type. It does not translate the meaning of English sentences. Write the words of your chosen language using English letters, rather than writing an English sentence and expecting its meaning to change.' },
  { question: 'Is my text private? Do I need an account?', answer: 'No account or payment is needed. Transliteration runs locally in your browser, without sending your text to a conversion server or saving a draft on our servers. Copy and download stay on your device. Email and WhatsApp open only when you choose them and pass the text to the app you select.' },
  { question: 'Can I copy, print or download the typed text?', answer: 'Yes. Copy Unicode text, download a UTF-8 TXT file or Word DOCX document, create a PNG image, or print the result. Your browser’s print dialog can also save it as a PDF. Fonts and complex-script shaping depend on the browser and fonts installed on your device.' },
  { question: 'Why does a word sometimes need a spelling correction?', answer: 'The local engine follows phonetic rules instead of an online prediction dictionary. English spellings can represent more than one sound. Long vowels, retroflex consonants, names and regional spellings may need an alternative spelling, a keyboard character or a direct edit in the result. Urdu is an experimental, unvocalized phonetic mapping; review its spelling carefully.' },
  { question: 'Can I paste a paragraph and keep some English words?', answer: 'Yes. Paste up to 20,000 characters and choose Whole passage, then Convert text. URLs, email addresses and existing native-script text are preserved. To keep another English word, edit it in the result after converting. English mode previews the entire source in English letters; Ctrl+G or Command+G switches that preview.' },
];

function renderText(source: string, languageId: string, mode: TypingMode, nativeDigits: boolean, englishMode: boolean) {
  if (mode === 'word' && !englishMode) {
    const unfinished = /[A-Za-z~^]+$/.exec(source);
    if (unfinished) return transliterateText(source.slice(0, unfinished.index), languageId, { nativeDigits }) + unfinished[0];
  }
  return transliterateText(source, languageId, { nativeDigits, englishMode });
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function textImage(text: string, direction: 'ltr' | 'rtl', fontFamily: string, fontSize: number) {
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image export is unavailable in this browser. Try TXT or Word.');
  const size = Math.max(26, fontSize);
  const font = `${size}px ${fontFamily}`;
  const width = 1400;
  const padding = 72;
  context.font = font;
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/(\s+)/)) {
      if (context.measureText(line + word).width <= width - padding * 2) line += word;
      else {
        if (line) { lines.push(line); line = ''; }
        // Split long runs only at grapheme boundaries, preserving vowel signs.
        const segments = Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(word), item => item.segment);
        for (const segment of segments) {
          if (context.measureText(line + segment).width > width - padding * 2) { lines.push(line); line = ''; }
          line += segment;
        }
      }
      if (lines.length > 180) throw new Error('This passage is too long for one image. Download TXT or Word instead.');
    }
    lines.push(line);
  }
  const height = Math.ceil(lines.length * size * 1.9 + padding * 2);
  if (height > 12000) throw new Error('This passage is too long for one image. Download TXT or Word instead.');
  canvas.width = width;
  canvas.height = height;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#132548';
  context.font = font;
  context.direction = direction;
  context.textAlign = direction === 'rtl' ? 'right' : 'left';
  context.textBaseline = 'top';
  lines.forEach((line, index) => context.fillText(line, direction === 'rtl' ? width - padding : padding, padding + index * size * 1.9));
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not create the image. Try downloading TXT instead.')), 'image/png'));
}

export default function IndianLanguageTyping() {
  const [languageId, setLanguageId] = useState('kn');
  const [mode, setMode] = useState<TypingMode>('live');
  const [englishMode, setEnglishMode] = useState(false);
  const [nativeDigits, setNativeDigits] = useState(false);
  const [simple, setSimple] = useState(false);
  const [fontSize, setFontSize] = useState(26);
  const [fontFamily, setFontFamily] = useState('system-ui, sans-serif');
  const [fullscreen, setFullscreen] = useState(false);
  const [doc, setDoc] = useState<EditorDocument>({ source: '', result: '', languageId: 'kn' });
  const [sourceCaret, setSourceCaret] = useState(0);
  const [editedResult, setEditedResult] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLTextAreaElement>(null);
  const history = useRef<EditorDocument[]>([{ source: '', result: '', languageId: 'kn' }]);
  const historyPosition = useRef(0);
  const language = getTypingLanguage(languageId);
  const keyboard = useMemo(() => getKeyboard(languageId), [languageId]);
  const counts = useMemo(() => countTypingText(doc.result), [doc.result]);
  const activeWord = useMemo(() => {
    const left = doc.source.slice(0, sourceCaret);
    const match = /[A-Za-z~^]+$/.exec(left);
    if (!match) return null;
    const right = /^[A-Za-z~^]*/.exec(doc.source.slice(sourceCaret))?.[0] ?? '';
    return { word: match[0] + right, start: match.index, end: sourceCaret + right.length };
  }, [doc.source, sourceCaret]);
  const suggestions = useMemo(() => activeWord && !englishMode && !simple ? getWordSuggestions(activeWord.word, languageId) : [], [activeWord, englishMode, languageId, simple]);

  const commit = useCallback((next: EditorDocument) => {
    const previous = history.current[historyPosition.current];
    const entry = { ...next, languageId: next.languageId ?? languageId };
    if (previous.source !== entry.source || previous.result !== entry.result || previous.languageId !== entry.languageId) {
      const entries = [...history.current.slice(0, historyPosition.current + 1), entry].slice(-60);
      history.current = entries;
      historyPosition.current = entries.length - 1;
      setHistoryState({ canUndo: entries.length > 1, canRedo: false });
    }
    setDoc(entry);
  }, [languageId]);

  const convert = useCallback((source = doc.source, options?: { language?: string; mode?: TypingMode; nativeDigits?: boolean; englishMode?: boolean }) => {
    try {
      const result = renderText(source, options?.language ?? languageId, options?.mode ?? mode, options?.nativeDigits ?? nativeDigits, options?.englishMode ?? englishMode);
      commit({ source, result, languageId: options?.language ?? languageId });
      setEditedResult(false);
      setStatus('');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Could not convert this text. Please try a shorter passage.'); }
  }, [commit, doc.source, englishMode, languageId, mode, nativeDigits]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'g' && !event.altKey) {
        event.preventDefault();
        setEnglishMode(value => !value);
        convert(doc.source, { englishMode: !englishMode });
      }
      if (event.key === 'Escape') setFullscreen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [convert, doc.source, englishMode]);

  useEffect(() => {
    if (!fullscreen) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = old; };
  }, [fullscreen]);

  function onSource(event: ChangeEvent<HTMLTextAreaElement>) {
    const source = event.currentTarget.value;
    if (source.length > MAX_TYPING_CHARACTERS) { setStatus('Keep this passage within 20,000 characters.'); return; }
    setSourceCaret(event.currentTarget.selectionStart);
    if (mode === 'passage') { commit({ source, result: doc.result }); setStatus('Passage changed. Choose Convert text to update the result.'); }
    else convert(source);
  }

  function changeLanguage(id: string) {
    setLanguageId(id);
    convert(doc.source, { language: id });
    setStatus(`Ready for ${getTypingLanguage(id).name}. Your source text is kept.`);
  }

  function insertSource(text: string, replace?: { start: number; end: number }) {
    const input = sourceRef.current;
    const start = replace?.start ?? input?.selectionStart ?? doc.source.length;
    const end = replace?.end ?? input?.selectionEnd ?? start;
    const source = doc.source.slice(0, start) + text + doc.source.slice(end);
    if (source.length > MAX_TYPING_CHARACTERS) { setStatus('Keep this passage within 20,000 characters.'); return; }
    convert(source, { mode: mode === 'passage' ? 'live' : mode });
    setSourceCaret(start + text.length);
    requestAnimationFrame(() => { input?.focus(); input?.setSelectionRange(start + text.length, start + text.length); });
  }

  function travelHistory(offset: number) {
    const position = Math.max(0, Math.min(history.current.length - 1, historyPosition.current + offset));
    historyPosition.current = position;
    setDoc(history.current[position]);
    setLanguageId(history.current[position].languageId ?? 'kn');
    setEditedResult(true);
    setHistoryState({ canUndo: position > 0, canRedo: position < history.current.length - 1 });
    setStatus(offset < 0 ? 'Previous edit restored.' : 'Edit restored.');
  }

  async function copy() {
    try { await navigator.clipboard.writeText(doc.result); setStatus('Copied. Paste your text wherever you need it.'); }
    catch { resultRef.current?.focus(); resultRef.current?.select(); setStatus('Text selected. Press Ctrl+C or Command+C to copy.'); }
  }

  async function download(kind: 'txt' | 'docx' | 'png') {
    setBusy(true);
    try {
      const name = `registerbox-${language.id}`;
      if (kind === 'txt') saveBlob(new Blob(['\ufeff', doc.result], { type: 'text/plain;charset=utf-8' }), `${name}.txt`);
      else if (kind === 'png') saveBlob(await textImage(doc.result, language.direction, fontFamily, fontSize), `${name}.png`);
      else {
        const { Document, Packer, Paragraph, TextRun } = await import('docx');
        const word = new Document({ sections: [{ children: doc.result.split('\n').map(text => new Paragraph({ bidirectional: language.direction === 'rtl', children: [new TextRun({ text, rightToLeft: language.direction === 'rtl', size: fontSize * 2, font: fontFamily.startsWith('serif') ? 'serif' : 'Arial' })] })) }] });
        saveBlob(await Packer.toBlob(word), `${name}.docx`);
      }
      setStatus(`${kind.toUpperCase()} download ready.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : 'The download could not be prepared. Please try TXT.'); }
    finally { setBusy(false); }
  }

  function share(kind: 'email' | 'whatsapp') {
    if (doc.result.length > 3500) { setStatus('For longer text, copy it or download a file to attach to your message.'); return; }
    const text = encodeURIComponent(doc.result);
    if (kind === 'email') window.location.href = `mailto:?subject=${encodeURIComponent(`${language.name} text`)}&body=${text}`;
    else window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
    setStatus(`Your ${kind === 'email' ? 'email app' : 'WhatsApp'} opens with the text. Review it there before sending.`);
  }

  const schema = [
    { '@type': 'WebApplication', name: 'RegisterBox Indian Language Typing', url: `${siteUrl}${toolPath}`, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Web browser', browserRequirements: 'Requires JavaScript', isAccessibleForFree: true, inLanguage: TYPING_LANGUAGES.map(item => item.lang), offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' }, featureList: ['28 language choices with explicit script labels', 'Local phonetic transliteration', 'Live, word and passage modes', 'Unicode text, Word and PNG downloads', 'On-screen character keyboard'] },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl }, { '@type': 'ListItem', position: 2, name: 'Free tools', item: `${siteUrl}/tools` }, { '@type': 'ListItem', position: 3, name: 'Indian language typing', item: `${siteUrl}${toolPath}` }] },
    { '@type': 'FAQPage', mainEntity: answers.map(item => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) },
  ];

  return <div className="rb-public-page rb-typing-page">
    <Seo title="Indian Language Typing — English to Kannada, Hindi & More | RegisterBox" description="Type Indian languages with an English keyboard. Free live phonetic typing in 28 language choices, with Unicode text, Word downloads and an on-screen keyboard. No login." path={toolPath} schema={schema}/>
    <a href="#typing-source" className="rb-skip">Skip to typing editor</a>
    <header className="rb-typing-header rb-container"><WebBrand/><nav aria-label="Free tools navigation"><Link href={'/tools' as Href}>All free tools</Link><Link href={'/tools/pdf-converter' as Href}>PDF converter <span aria-hidden="true">↗</span></Link></nav></header>
    <main>
      <section className="rb-typing-hero rb-container">
        <p className="rb-typing-kicker"><span aria-hidden="true">ಅ</span> YOUR KEYBOARD. MORE POSSIBILITIES.</p>
        <h1>Your words.<br/><span>Your language.</span></h1>
        <p className="rb-typing-intro">Type the way it sounds, in English letters. Watch your words take shape in Kannada, Hindi and 26 more language choices.</p>
        <div className="rb-typing-badges"><span><b aria-hidden="true">✓</b> Free. No login.</span><span><b aria-hidden="true">✓</b> Converts as you type</span><span><b aria-hidden="true">✓</b> Text stays in your browser</span></div>
      </section>

      <section className={`rb-typing-workbench rb-container${fullscreen ? ' rb-typing-fullscreen' : ''}`} aria-label="Indian language typing editor" data-clarity-mask="true">
        <h2 className="rb-visually-hidden">Language typing workspace</h2>
        <div className="rb-typing-config">
          <label htmlFor="typing-language">I want to type in<select id="typing-language" value={languageId} onChange={event => changeLanguage(event.target.value)}>{TYPING_LANGUAGES.map(item => <option key={item.id} value={item.id}>{item.name} · {item.nativeName} ({item.scriptLabel}){item.experimental ? ' · experimental' : ''}</option>)}</select></label>
          <p className="rb-typing-language-note"><b lang={language.lang}>{language.nativeName}</b><span>{language.scriptLabel} script · {language.direction === 'rtl' ? 'right to left' : 'left to right'}</span></p>
          {fullscreen && <button type="button" className="rb-typing-exit-focus" onClick={() => setFullscreen(false)}>Exit focus view ×</button>}
        </div>
        {language.note && <p className="rb-typing-inline-note">{language.note}</p>}
        <div className="rb-typing-options">
          <div className="rb-typing-mode" role="group" aria-label="Conversion timing">{modes.map(item => <button key={item.id} type="button" className={mode === item.id ? 'is-active' : ''} aria-pressed={mode === item.id} title={item.description} onClick={() => { setMode(item.id); convert(doc.source, { mode: item.id }); }}>{item.title}</button>)}</div>
          <label><input type="checkbox" checked={englishMode} onChange={event => { setEnglishMode(event.target.checked); convert(doc.source, { englishMode: event.target.checked }); }}/> English preview <kbd>Ctrl / ⌘ G</kbd></label>
          <label><input type="checkbox" checked={nativeDigits} onChange={event => { setNativeDigits(event.target.checked); convert(doc.source, { nativeDigits: event.target.checked }); }}/> Native numbers</label>
          <label><input type="checkbox" checked={simple} onChange={event => setSimple(event.target.checked)}/> Simple view</label>
        </div>
        <div className="rb-typing-editor-grid">
          <div className="rb-typing-editor">
            <div className="rb-typing-editor-heading"><label htmlFor="typing-source"><span>01</span> Type in English letters</label><button type="button" onClick={() => { const example = language.exampleRoman; setSourceCaret(example.length); convert(example, { mode: 'live' }); sourceRef.current?.focus(); }}>Try an example <span aria-hidden="true">↗</span></button></div>
            <textarea id="typing-source" ref={sourceRef} dir="auto" lang="en" value={doc.source} onChange={onSource} onSelect={event => setSourceCaret(event.currentTarget.selectionStart)} maxLength={MAX_TYPING_CHARACTERS} spellCheck={false} autoCapitalize="off" autoCorrect="off" autoComplete="off" placeholder={`Try “${language.exampleRoman}”\n\nWrite your words as they sound. You can paste a passage, too.`} aria-describedby="typing-method" onCompositionEnd={event => { if (mode !== 'passage') convert(event.currentTarget.value); }}/>
            <div className="rb-typing-editor-footer"><span>{doc.source.length.toLocaleString('en-IN')} / 20,000 characters</span><span>{mode === 'passage' ? 'Convert when you’re ready' : mode === 'word' ? 'Space finishes a word' : 'Live phonetic typing'}</span></div>
          </div>
          <div className="rb-typing-editor rb-typing-result">
            <div className="rb-typing-editor-heading"><label htmlFor="typing-result"><span>02</span> {language.name} result</label><span>Unicode · editable</span></div>
            <textarea id="typing-result" ref={resultRef} lang={language.lang} dir={language.direction} value={doc.result} onChange={event => { commit({ ...doc, result: event.currentTarget.value }); setEditedResult(true); }} maxLength={MAX_TYPING_CHARACTERS * 4} spellCheck={false} style={{ fontSize, fontFamily }} placeholder={language.exampleText} aria-label={`${language.name} result, editable`}/>
            <pre className="rb-typing-print-text" lang={language.lang} dir={language.direction} style={{ fontFamily }}>{doc.result}</pre>
            <div className="rb-typing-editor-footer"><span>{counts.words.toLocaleString('en-IN')} words · {counts.characters.toLocaleString('en-IN')} characters</span><span>{editedResult ? 'Edited by you' : 'Ready to copy'}</span></div>
          </div>
        </div>
        {editedResult && <p className="rb-typing-inline-note">Your result edits are kept here. Changing the source or language creates a fresh result.</p>}
        {!simple && <div className="rb-typing-suggestions" aria-label="Phonetic spelling alternatives"><span>{activeWord ? `Alternatives for “${activeWord.word}”` : 'Spelling alternatives'}</span>{suggestions.length ? suggestions.map(value => <button type="button" key={value} lang={language.lang} dir={language.direction} onClick={() => activeWord && insertSource(value, activeWord)}>{value}</button>) : <small>Type or select an English word to see phonetic alternatives.</small>}</div>}
        <div className="rb-typing-actions">
          <button type="button" className="is-primary" disabled={!doc.source} onClick={() => convert(doc.source, { mode: 'live' })}>Convert text <span aria-hidden="true">→</span></button>
          <button type="button" disabled={!doc.result} onClick={copy}>Copy text</button>
          <button type="button" disabled={!doc.result || busy} onClick={() => download('txt')}>TXT <span aria-hidden="true">↓</span></button>
          <button type="button" disabled={!doc.result || busy} onClick={() => download('docx')}>Word <span aria-hidden="true">↓</span></button>
          {!simple && <><button type="button" disabled={!doc.result || busy} onClick={() => download('png')}>Image <span aria-hidden="true">↓</span></button><button type="button" disabled={!doc.result} onClick={() => window.print()}>Print / PDF</button><button type="button" disabled={!doc.result} onClick={() => share('email')}>Email <span aria-hidden="true">↗</span></button><button type="button" disabled={!doc.result} onClick={() => share('whatsapp')}>WhatsApp <span aria-hidden="true">↗</span></button></>}
          <button type="button" disabled={!historyState.canUndo} onClick={() => travelHistory(-1)}>Undo</button><button type="button" disabled={!historyState.canRedo} onClick={() => travelHistory(1)}>Redo</button>
          <button type="button" disabled={!doc.source && !doc.result} onClick={() => { commit({ source: '', result: '' }); setEditedResult(false); setStatus('Cleared. Undo can bring your text back.'); }}>Clear</button>
        </div>
        {!simple && <div className="rb-typing-format"><label>Text size <button type="button" aria-label="Decrease result text size" disabled={fontSize <= 18} onClick={() => setFontSize(size => size - 2)}>−</button><span>{fontSize}px</span><button type="button" aria-label="Increase result text size" disabled={fontSize >= 48} onClick={() => setFontSize(size => size + 2)}>+</button></label><label htmlFor="typing-font">Font <select id="typing-font" value={fontFamily} onChange={event => setFontFamily(event.target.value)}><option value="system-ui, sans-serif">System</option><option value="serif">Serif</option><option value="sans-serif">Sans serif</option></select></label><button type="button" aria-pressed={fullscreen} onClick={() => setFullscreen(value => !value)}>{fullscreen ? 'Exit focus view' : 'Focus view'} <span aria-hidden="true">⤢</span></button></div>}
        <p className="rb-typing-status" role="status" aria-live="polite">{busy ? 'Preparing your download…' : status || modes.find(item => item.id === mode)?.description}</p>
        {!simple && <div className="rb-typing-extras"><details><summary>{language.name} keyboard <span>Letters, signs & numbers</span></summary><div className="rb-typing-keyboard-groups">{Object.entries(keyboard).map(([group, keys]) => <section key={group}><h3>{group === 'vowelMarks' ? 'Vowel signs' : group}</h3><div className="rb-typing-keys">{keys.map((key, index) => <button type="button" key={`${group}-${index}`} title={`Insert ${key.text}${key.roman ? ` (${key.roman})` : ''}`} onClick={() => insertSource(key.text)}><b lang={language.lang}>{/^\p{Mark}/u.test(key.text) ? `◌${key.text}` : key.text}</b><small>{key.roman || 'insert'}</small></button>)}</div></section>)}</div></details><details><summary>Emoji & symbols <span>Add a little expression</span></summary><div className="rb-typing-emoji">{emojis.map(emoji => <button key={emoji} type="button" aria-label={`Insert ${emoji}`} onClick={() => insertSource(emoji)}>{emoji}</button>)}</div></details></div>}
        <p className="rb-typing-privacy"><span aria-hidden="true">♧</span><span><strong>Your words stay with you.</strong> Conversion happens on your device. We don’t store your typed text. Sharing is always your choice.</span></p>
      </section>

      <section className="rb-typing-guide rb-container" id="typing-method">
        <p className="rb-typing-kicker">A FAMILIAR KEYBOARD. A NEW SCRIPT.</p><h2>Write it like you say it.</h2>
        <div className="rb-typing-guide-grid"><article><span>01</span><h3>Choose your language</h3><p>Pick a language and check its script. Kannada starts as the default; you can switch any time while keeping your source text.</p></article><article><span>02</span><h3>Type the sound</h3><p>Use English letters: <b>namaskaara → ನಮಸ್ಕಾರ</b>. Try <b>aa</b> for a long vowel, <b>sh</b> for a “sh” sound, and the spelling alternatives for another form.</p></article><article><span>03</span><h3>Make it yours</h3><p>Review the result, correct a letter, then copy it into a message or download a document. All output uses portable Unicode text.</p></article></div>
        <p className="rb-typing-tips"><strong>Typing, explained.</strong> This changes the script of the words you sound out. It doesn’t translate their meaning. The local phonetic engine uses spelling rules; regional spellings and names may need a correction. Use the keyboard to insert an exact letter.</p>
        <h2>28 language choices. Many shared scripts.</h2><p>Languages don’t map one to one to India’s states. Choose the language you write and the script shown below. These are the writing systems available in this tool.</p>
        <div className="rb-typing-language-list">{TYPING_LANGUAGES.map(item => <button key={item.id} type="button" onClick={() => { changeLanguage(item.id); document.getElementById('typing-language')?.focus(); document.getElementById('typing-source')?.scrollIntoView({ block: 'center', behavior: 'auto' }); }}><strong lang={item.lang}>{item.nativeName}</strong><span>{item.name}</span><small>{item.scriptLabel}{item.experimental ? ' · experimental' : ''}</small></button>)}</div>
        <div className="rb-typing-tips"><strong>Privacy and sharing.</strong> Typing and file generation run locally. Your passage is not saved when you refresh or leave. Email and WhatsApp pass the result to that app only after you choose the relevant button. Never put confidential text into a message you don’t intend to send.</div>
        <h2>A few useful answers.</h2><div className="rb-typing-faq">{answers.map(item => <details key={item.question}><summary>{item.question}<span aria-hidden="true">+</span></summary><p>{item.answer}</p></details>)}</div>
        <p className="rb-typing-inline-note">Phonetic conversion powered by the open-source <a href="https://github.com/indic-transliteration/sanscript.js" target="_blank" rel="noopener noreferrer">Sanscript library</a>. Review important documents with a fluent reader. Need to change file formats? <Link href={'/tools/pdf-converter' as Href}>Open our free PDF converter →</Link></p>
      </section>
    </main><SiteFooter/>
  </div>;
}
