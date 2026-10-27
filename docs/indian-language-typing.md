# Indian language typing

The public `/tools/indian-language-typing` editor is linked from `/tools`, the site header, homepage and footer. No account or payment is required.

## Prediction and input styles

The initial release used Sanscript letter rules. Those rules did not recognize ordinary English spellings such as `tea`, `my` and `name`. Smart typing now uses a browser worker running AI4Bharat IndicXlit, beam search, language-specific word frequencies and CMUdict pronunciation aliases. The default is smart typing; while its automatic first-load download is preparing, unknown words remain literal rather than displaying approximate rules as successful predictions. Word suggestions stay enabled for all supported languages. There is no enable/disable switch.

Twenty choices have a matching predictive language/script model: Assamese, Bengali, Bodo, Konkani (Devanagari), Gujarati, Hindi, Kannada, Kashmiri (Perso-Arabic), Maithili (Devanagari), Malayalam, Manipuri (Meitei Mayek), Marathi, Nepali, Odia, Punjabi (Gurmukhi), Sanskrit, Sindhi (Arabic), Tamil, Telugu and Urdu. Dogri, Santali, Bhojpuri, Chhattisgarhi, Haryanvi, Magahi, Rajasthani and Tulu remain explicitly labeled **basic sound mapping**. They are not silently assigned another language's predictive model.

Auto input style uses a conservative English-marker heuristic for phrases. Users can explicitly choose **Indian words in English letters** or **English words by sound**. This resolves cases such as Hindi `main` (मैं or मेन) where the same Roman spelling can express different intended sounds. Neither profile translates meanings or checks grammar. Model predictions cannot guarantee intended spelling; ranked alternatives remain available.

Candidates appear near the source caret and in the persistent suggestion row. Arrow keys choose a candidate; Enter inserts it, Escape closes the popup, and Alt+1 through Alt+5 insert a numbered candidate. Selection records the chosen spelling for that source-word occurrence and updates only the result. The original English source remains unchanged. Unrelated source edits shift saved choices; editing the chosen word invalidates its saved choice. Native keyboard characters and emoji insert only into the editable result. Existing native text, URLs, email addresses, fixed acronyms, punctuation and spacing stay unchanged.

Live mode debounces inference off the main thread. On-space mode keeps the unfinished last word Roman. Whole-passage mode converts only on request. New source input, language/style changes, manual result edits, Clear and Undo cancel old conversions; both an abort signal and a document version prevent late responses from repainting newer text. IME composition is not converted mid-composition.

## Assets, privacy and security

Typed words are processed entirely on the device. Only same-origin static model/runtime/lexicon requests are needed. No typed text is put in request URLs, bodies, telemetry, server drafts or persistent browser storage. The model/runtime download is about 63 MB, plus small compressed dictionaries, so the page shows automatic preparation progress. HTTP caching can reuse static assets; there is no persistent draft.

The MIT model archive and individual model files are checksum-pinned in `scripts/prepare-typing-assets.mjs`. The archive is parsed using a strict three-file allowlist, without executing its package JavaScript or installing its native Node runtime. ONNX Runtime Web is version-pinned. Compressed language frequency lexicons and CMUdict data retain source, license and derivation manifests; their generators are development utilities, not runtime services. Raw generated lexicon JSON and model/runtime assets are ignored; the build regenerates the latter from the pinned archive.

Input is bounded to 20,000 UTF-16 characters; predictions accept up to 40 ASCII letters per word. Overlong or unsupported runs remain literal. In-memory caches hold at most 600 word/profile entries and history holds 60 edits. Work is serialized in a Web Worker with cancellation between inference steps. Model or dictionary failure is surfaced; it cannot silently switch a smart result to approximate rule output.

User text is rendered through controlled textareas, React text, canvas `fillText` and DOCX text runs, never HTML evaluation. Clarity is skipped on direct tool visits and masked on client navigation. The existing tool security headers remain in force. Email and WhatsApp pass text to the selected app only after the user clicks their button.

## Verification and limits

`npm run test:typing`, `npx expo lint`, `npx tsc --noEmit` and a static web export are required. `docs/typing-quality-cases.json` separates user-confirmed regressions, developer probes and editor-flow checks. The corpus is a release smoke test, not a native-reviewed accuracy benchmark. A small passing sample does not prove perfect language support.

Browser QA covers the reported Kannada and Hindi phrases, ranked suggestions, keyboard selection, chosen-spelling retention, caret editing, mode boundaries, stale-source/language responses, manual edits, IME, model-load failure, no-login access and mobile overflow. The page has crawlable instructions, support labels, FAQs, canonical metadata and WebApplication/BreadcrumbList/FAQPage structured data. These aid discovery without promising rankings.
