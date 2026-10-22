# Regional blog languages

Each completed translation has a permanent URL, for example `/kn/blog/gstr-3b-filing-process-online` for Kannada and `/ta/blog/gstr-3b-filing-process-online` for Tamil. The HTML is exported with the article text, its own canonical, language alternates, and sitemap entries. Readers can choose a language; browser preference can suggest one. A visitor's state does not reliably identify their reading language, so the site does not force a location-based redirect.

English and the existing Hindi articles remain authored content. Authored Kannada/Tamil files also take precedence over generated output. An incomplete locale is not advertised as a translated page. A changed English article needs its translation refreshed and reviewed before its regional wording is considered current.

## Without a translation account

No Google Cloud account or API key is needed to read, build, deploy, or use the authored translations. Normal builds keep the committed translations. There are no paid translation calls in the browser, and no translation key is exposed to readers.

Prepare additional translations with a translator or an editor, then import a JSON bundle:

```sh
node scripts/translate-blog.mjs --import /absolute/path/reviewed-translations.json --dry-run
node scripts/translate-blog.mjs --import /absolute/path/reviewed-translations.json
```

The format is `{"version":1,"locales":{"kn":{"ui":{},"articles":{}}}}`. `ui` must translate every key from `src/data/blog/ui-en.json` and preserve variables such as `{language}` and `{date}`. `articles` maps an existing English slug to a completed article with this shape:

```json
{
  "title": "Translated title",
  "description": "Translated description",
  "intro": ["Translated introduction"],
  "sections": {
    "existing-section-id": {
      "heading": "Translated heading",
      "paragraphs": ["Translated explanation"],
      "bullets": ["Translated item, when needed"]
    }
  },
  "faqs": [{"question": "Translated question", "answer": "Translated answer"}],
  "availabilityNote": "Required if the English article has one",
  "imageAlt": "Optional translated illustration description",
  "searchQuestions": ["Optional translated search question"]
}
```

The example uses English labels only to explain the schema. Actual regional text must contain the expected writing script. Every original section ID is required, and every imported article must have a complete title, description, introduction, sections and FAQs. Lists may be expressed as clear prose in an authored translation. Original links, source IDs, publication dates and application routes are inherited from the English article, not recreated by a translator. `--languages kn,ta` can limit an import to those locales. An import can contain a subset of article slugs; each included article must be complete. Importing never edits the separate authored files.

## Optional automatic translation

`scripts/translate-blog.mjs` uses Google Cloud Translation Basic REST v2 with the standard NMT model. It requires Node.js with built-in `fetch` and the project's existing dependencies; it adds no translation package. Source content is limited to public English blog/UI text.

First check the scope without any account, key, network calls, or writes:

```sh
node scripts/translate-blog.mjs --dry-run
node scripts/translate-blog.mjs --languages kn,ta --dry-run
```

If automatic translation is wanted later:

1. Create a Google Cloud project, enable billing and the Cloud Translation API, and create an API key restricted to Cloud Translation. Restrict its application access to the build environment where practical.
2. Save the key as the secret build/CI environment variable `GOOGLE_TRANSLATE_API_KEY`. Do not use an `EXPO_PUBLIC_` prefix, commit it, paste it into a command argument, or put it in client code.
3. Set a budget alert and a conservative Translation API quota in Google Cloud. Google charges by processed characters for each target language; the dry-run report estimates input characters, including preservation placeholders. It is an estimate, not a quote. Check the current [pricing](https://cloud.google.com/products/translate/pricing) before enabling calls.
4. Run `node scripts/translate-blog.mjs --languages kn,ta`, review the generated language and factual wording, then build and deploy. To translate all configured supported languages, omit `--languages`.
5. The build integration is explicitly optional: enable `BLOG_TRANSLATION_AUTO=1` only when the translation credential and spend controls are ready. Otherwise builds continue with committed content. If automatic mode is enabled and the key/provider fails, the translation step fails and preserves the previous generated file.

The API key is sent in the `x-goog-api-key` request header. It is never added to a URL or printed in error messages. Requests specify `format: "text"`, `source: "en"`, and `model: "nmt"`. The script verifies the provider's live supported-language list before translating. It batches at most 128 strings and approximately 5,000 Unicode code points per request, below the Basic API byte limit. Protected placeholders retain RegisterBox, GST terms, contact links, technical identifiers, template variables and digits. Links and source IDs outside article prose never go through translation.

Hashes of each article's public source text and UI source are saved with provider/time metadata in `src/data/blog/regional.generated.json`. Unchanged, valid generated articles are reused. A run constructs the whole requested update in memory and writes it using an atomic rename only after all requested UI strings and articles validate. Failed requests, incomplete responses, changed placeholders and empty translations leave the prior file intact. A failed run may still incur charges for successful API calls before the failure; the script does not automatically retry paid calls.

Commit the generated bundle after a reviewed translation run so subsequent deployment builds reuse its hashes. Vercel builds use a fresh checkout: translations generated only inside a build are not durable source updates and may be billed again on a later build. Leave automatic build mode disabled until a workflow persists reviewed generated output. Complete authored Kannada/Tamil catalogues are skipped by the provider to avoid translating text that would not be displayed.

## Language coverage and publication

`src/data/blog/locales.json` declares English plus the 22 scheduled Indian languages. `translationCode: null` means no supported Google NMT mapping is configured. The current official NMT list does not list Bodo, Kashmiri or Santali; these require reviewed imports or another suitable provider and are not represented by substitute languages. Google support can change, so the script checks the live API before paid translations. English and Hindi are never regenerated by this script.

Self-hosted IndicTrans2 may be evaluated later as a provider-independent alternative, including its model licence, compute requirements, language/script coverage and quality. It has no invented API endpoint in this project. Its output can use the same reviewed import format.

Translation creates crawlable content; it does not guarantee that Google will index or rank each language URL or show it for every regional query. Sitemap and `hreflang` help discovery and language matching. Google still chooses what to crawl and index. Keep useful original content, accurate linked authorities, working application/call links and clear state-specific limitations. Native-language review is especially valuable for tax, deadlines, fees and eligibility wording.

## Official references

- [Google Basic translate REST method](https://docs.cloud.google.com/translate/docs/reference/rest/v2/translate)
- [Google supported languages, NMT section](https://docs.cloud.google.com/translate/docs/languages#nmt)
- [Google Basic supported-language API](https://docs.cloud.google.com/translate/docs/reference/rest/v2/languages)
- [Google Translation quotas and request sizes](https://docs.cloud.google.com/translate/quotas)
- [Google API key usage and restrictions](https://docs.cloud.google.com/docs/authentication/api-keys-use)
- [Google Translation setup](https://docs.cloud.google.com/translate/docs/setup)
- [Google multilingual site guidance](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
- [Google localized versions and hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions)
