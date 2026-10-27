# Callback and GST walkthrough update — 27 October 2026

The first-visit callback prompt now uses a compact two-step dialog: service selection, then contact details and affirmative callback consent. Existing intake payload, honeypot, suppression periods and backend remain in place. Explicit callback links reopen a fresh request, keyboard focus returns on close, and automatic prompting waits during video playback.

The homepage hero keeps its existing two-column layout. The right side now plays the 72-second real-app GST walkthrough, followed by a brief description and “Read the walkthrough”. The movie uses a sample business and illustrative nil GSTR-1/GSTR-3B acknowledgements marked EXAMPLE—NOT FILED.

`/watch/gst-filing` is a public, statically rendered watch page. Shared metadata in `src/data/gst-intro-video.ts` supplies VideoObject, the video URL, poster, duration and upload date. The discovery generator includes this page alongside the existing educational video, preserving the prior video sitemap entry. Actual search indexing remains Google’s decision after crawl.

Validation: release Expo lint, TypeScript, static export, callback flow contract, blog/regional/service/pricing/public-link and video checks; desktop 1440×1000 and phone 390×844 visual review; service selection, required-field validation, Escape/focus restoration, walkthrough expansion and video playback. No live callback lead or government filing was submitted during UI verification.

The older `check-website-recovery.mjs` still asserts that public prices were removed. It fails against the unchanged `llms.txt` from published main; newer pricing-placement checks pass. This update preserves the currently published prices.

Built from published main `abb76349554cd6acd427ef482b9db4d6ab156f9f`. Preserve the dirty primary mobile/Tally checkout when publishing website changes.
