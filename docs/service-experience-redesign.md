# Service experience redesign — 16 October 2026

Implemented using ui-ux-pro-max for visual hierarchy, progressive disclosure, touch controls and reduced-motion support. GST UX guidance preserves the distinction between preparation, filing and verified acknowledgement; no provider or filing logic changed.

## Scope

- All 12 service detail pages use a shared visual layout and category-specific presentation data.
- Short service name, audience and three benefits replace the long introductory wall of text.
- Service illustration and fee/quote card provide one main application action.
- Direct existing application flows are primary. Signed-out users retain the selected application through the auth `next` parameter; signed-in users use the existing destination. GST returns opens the existing GST workspace. Trademark remains clearly enquiry-only, because no online trademark application workflow is connected.
- Calls, WhatsApp and callback requests are secondary help paths, not substitutes for online applications.
- Three-step guidance, visual document cards, an optional preparation-stage selector and expandable detailed guidance reduce initial reading load.
- The service directory has visual cards, category filters, search, result counts and an empty-state reset.
- Mobile has a persistent application action with reserved bottom space, safe-area padding and no observed horizontal overflow at 390px.
- Existing detailed content and genuine Google review links remain accessible; no testimonials or ratings fabricated.

## Verification

- `npx tsc --noEmit`: passed.
- `npx expo lint`: passed.
- `npx expo export --platform web --output-dir /tmp/registerbox-local-search-preview`: passed.
- `REGISTERBOX_SEARCH_BUILD_DIRECTORY=/tmp/registerbox-local-search-preview node --test scripts/test-local-search.mjs`: 15 tests passed, including all 12 service routes and primary-action destination checks.
- Browser: desktop and 390 × 844 mobile layouts inspected; document disclosure opens; preparation-stage selection updates the secondary support message; search for FSSAI returns one match; nonexistent search exposes reset; Manage & comply shows two services.
- Browser: clicking Start GST registration reaches `/auth?next=%2Fonboarding%2Fapplication%3Fcategory%3Dgst_registration`. No sign-in code, real application, documents or filing submitted.
- Three-second comprehension is a design goal, not an empirically measured conversion or usability result.

## Handoff

Local preview: http://localhost:8087/services . Not published to registerbox.in. Publishing was paused after the owner requested this redesign. Preserve unrelated dirty application changes when preparing any later production release.

Current screenshots: screenshots/services-redesign-direct-desktop.png, screenshots/services-redesign-direct-mobile.png, screenshots/services-redesign-gst-desktop.png. Earlier screenshots bearing the generic Talk to our team primary action are superseded.

An earlier full-site SEO check found multiple H1s on the existing policies page. That unrelated page is not changed by this redesign. Build also emits the existing worker-f package exports warning; export succeeds.
