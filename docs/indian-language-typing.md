# Indian language typing

Public routes: `/tools` and `/tools/indian-language-typing`. Both are available without an account, payment or public lead form. The site header links to the tools hub, and the homepage cards and footer expose the individual tools.

## Typing behavior

The English-letter source is kept beside an editable Unicode result. Live mode converts every input change. Word mode leaves the unfinished last word in Roman letters until a space or punctuation; Passage mode converts on request. The original source stays available when the user changes languages. Manual result corrections remain until a new conversion replaces them. English preview (Ctrl/Command+G) previews the entire source without changing scripts.

Local alternatives offer common spellings and bounded phonetic variations. They are not a remote predictive dictionary. The on-screen keyboard includes vowels, consonants, dependent vowel signs, other signs and numbers. Controls include native numbers, text size and font, simple/focus views, emoji, counters, undo/redo, copy, clear, TXT/DOCX/PNG export and print/browser Save as PDF. Email and WhatsApp open only after explicit user action and do not send a message automatically.

The input limit is 20,000 UTF-16 characters. History is bounded to 60 edits. Image export is bounded to 180 wrapped lines and 12,000 pixels high. Long sharing text is directed to file download or clipboard instead of an oversized URL.

## Language and script coverage

There are 28 labeled language choices: the 22 scheduled Indian languages plus Bhojpuri, Chhattisgarhi, Haryanvi, Magahi, Rajasthani and Tulu. Choices that share a script are not separate language models. Kashmiri and Sindhi use Devanagari here, Konkani uses Devanagari, Punjabi uses Gurmukhi, Tulu uses Kannada, Manipuri uses Meitei Mayek, and Santali uses Ol Chiki. Other script variants are not offered.

Urdu, Kashmiri, Sindhi, Manipuri and Santali are visibly labeled experimental. This is sound-to-script conversion, not meaning translation, grammar checking, or a claim of native-reviewed dictionary accuracy. Fonts and shaping depend on the user's system. Important documents need spelling review by a fluent reader.

## Privacy and security

No transliteration request leaves the browser. There is no upload endpoint, text API, server draft or local persistent draft. Text is rendered through controlled textareas, React text, canvas `fillText`, and DOCX text runs. User text is never inserted as HTML or evaluated. URLs, email addresses and already-native text remain ordinary text.

The typing workspace carries Clarity masking for client navigation from other pages. Direct visits to all public tools skip Clarity initialization. The exact routes are public in the web shell and carry tool security headers. Email and WhatsApp explicitly pass text to the user-selected app when the corresponding button is clicked.

The engine uses an exact vendored MIT-licensed Sanscript 1.3.3 runtime and included script tables. The unused npm build-time TOML parser is not installed. See `src/vendor/sanscript/README.md` for upstream provenance, registry integrity and checksums. Local spelling helpers and Ol Chiki/Urdu adaptations live outside the unchanged vendor file.

## Search discovery

The first static response includes instructions, all language/script labels, examples, privacy/limitations and visible FAQs. It includes canonical metadata and WebApplication/BreadcrumbList/FAQPage structured data. The tools hub, sitemap and llms.txt link to the typing page. These make it discoverable; they do not guarantee indexing or ranking.

## Verification

```sh
npm run test:typing
npx expo lint
npx tsc --noEmit
npx expo export --platform web --output-dir /private/tmp/registerbox-typing-web
python3 scripts/check-public-seo.py /private/tmp/registerbox-typing-web
```

Browser QA must check live typing, word/passage modes, all language examples, source/result edits and caret behavior, language switching with undo, native numbers, keyboard insertion, copy/downloads, print output, mobile layout, direct public access and navigation from the homepage. Engine tests include every advertised example, address preservation, input bounds, prototype-like words, adversarial punctuation, keyboard groups, script adaptations and the vendor checksum.
