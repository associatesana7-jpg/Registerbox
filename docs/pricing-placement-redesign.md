# Pricing placement redesign — 26 October 2026

## Problem and design

The blog package panel was rendered after the complete article, FAQs and sources. Package cards placed their action after a long inclusion list. Mobile checkout placed its selected total after the information form.

- Article headers now pair the title with a contextual catalogue-backed price and safe next action. Call and full-scope links are adjacent. All language articles use the same shared component.
- Mobile articles have a compact fixed price/start/call dock with reserved bottom space and safe-area padding.
- Full blog cards retain visible inclusions and fee notes, with their action moved beside the price. Single-package cards use a balanced two-column layout on desktop.
- Homepage GST/FSSAI/Udyam offers appear directly after the hero. Service and directory cards prioritise amount/action before long descriptions. Service mobile heroes repeat a compact decision panel directly below the heading.
- Checkout has an early selected/recorded total and next-step panel. It navigates to application, sign-in, details or existing-payment status; it never triggers payment itself.
- Service package cards keep fee notes visible. Only detailed package inclusions may expand; FAQs, official sources and document guidance stay readable.

## Unchanged boundaries

No prices, package definitions, government fee inclusions, payment APIs, consent checks, tax filing controls, backend permissions or database records changed. Free nil filing has no paid checkout; quotation-based services do not use related-package prices as an incorporation fee. Existing pending payments use their recorded total.

Browser testing caught a guest navigation issue: a bare onboarding URL could lose its category through the generic sign-in guard. New and affected registration entry links now explicitly preserve the selected category in the sign-in `next` destination.

## Video discovery follow-up

The live MP4 returned HTTP 206 with valid byte-range headers, and its stable JPEG poster returned HTTP 200. The file already has the MP4 metadata (`moov`) before the media payload. The reported issue could not be attributed to a broken public asset from those checks.

Search Console inspection of the canonical URL confirmed the page was indexed, with one valid video item, but video indexing said “Video isn't on a watch page” and “No — the video is supplementary content on the page.” The report’s crawl timestamp was 26 October 2026, 01:31:58 IST. This is a watch-page eligibility issue, not evidence that the file URL cannot be fetched.

The what-is-gst page now presents one prominent video player before the written guide, without a decorative cover displacing it. The player is in the static HTML with a direct MP4 URL, metadata-only preload, captions and a stable poster. Its WebPage metadata names the VideoObject as the main entity. A generated video sitemap lists the canonical watch page and public assets; robots.txt advertises it. Supporting article embeds stay lightweight and are not falsely listed as watch pages. Google must recrawl and assess the page; video indexing is not guaranteed.

Reference: https://developers.google.com/search/docs/appearance/video and https://developers.google.com/search/docs/crawling-indexing/sitemaps/video-sitemaps.

## Verification

Run lint/typecheck, static export, `check-pricing-placement.mjs`, the existing blog/regional/service/answer/public-link checks, and the checkout-entrypoint/application-payment/payment-journey tests. Check desktop and 390px/320px mobile layout, call targets, registration auth destinations, free nil and quotation cases.
