# Regional language publication

The launch catalogue contains 23 guides each in English, Hindi, Kannada and Tamil. Existing English/Hindi URLs stay in place. Kannada uses `/kn/blog` and Tamil uses `/ta/blog`; article slugs stay stable across languages.

All article bodies, navigation, questions, search descriptions and application button labels are translated. Official source titles and the original destination URLs are retained so readers can identify the authority they are opening. State-specific guidance stays state-specific when translated: a Karnataka registration guide does not become a Tamil Nadu registration guide merely because it is written in Tamil.

`src/data/blog/localized.ts` only exposes complete article/UI bundles. `generateStaticParams` exports their HTML. The same catalogue builds reciprocal language alternates, self-canonical URLs, the sitemap, JSON feed, AI discovery links and the analytics allowlist. Unsupported or unfinished languages are excluded; unavailable language views return `noindex` rather than an English page at a regional URL.

Visitors arriving at `/kn/blog/...` read Kannada immediately. Visitors arriving at `/ta/blog/...` read Tamil immediately. They need not choose a language after arriving from Search. The optional language selector supports direct entry and changing a previous choice. Browser preferences can suggest another published language, without sending the visitor's location to a service.

The site cannot read a person's private search query or instruct Google/AI systems to rank a particular result. Google must crawl and select each published page. A search in Kannada may surface the Kannada page once indexed, but appearance, position and timing are not guaranteed. No Google Translation account is required for these committed translations.

The remaining scheduled languages are configured for expansion. Their article content has not been published yet. For future unattended translation, the optional provider/import pipeline is documented in [blog-regional-languages.md](blog-regional-languages.md). Keep automatic provider mode disabled until a translation service or local model and a durable publishing workflow are configured.

Validation commands:

```sh
npm run lint
./node_modules/.bin/tsc --noEmit
npm run build:web
node scripts/check-blog-build.mjs dist
node scripts/check-regional-blog-build.mjs dist
node scripts/check-public-links.mjs dist
node scripts/test-public-analytics.mjs
node scripts/test-dpdp-web-access.mjs
```

The production build regenerates the sitemap from completed translations. Submit the existing `https://www.registerbox.in/sitemap.xml` in Search Console; a new sitemap URL is not required for every language.
