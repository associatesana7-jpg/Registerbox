# Mobile service and registration UX — 16 October 2026

## Changes

- Mobile service cards use a single column, with visible illustrations, fees/quote labels and service actions.
- Existing online application destinations stay primary; support links are secondary. The chosen service survives sign-in.
- Mobile sign-in prioritises the actual form rather than the desktop marketing panel.
- The shared registration flow has four short progress stages, larger labelled inputs, appropriate keyboards, large choice cards and searchable long option lists.
- Back/Continue actions remain available in a measured footer. Content padding follows the actual footer height, including validation errors and wrapped text.
- Document cards show upload state and larger document actions. Saving, sending to RegisterBox and government filing remain distinct.
- Questionnaire requirements, backend validation, postal-address confirmation, upload handling and submission calls were not changed.

## Verification

- `npx tsc --noEmit` — passed.
- `npx expo lint` — passed without warnings.
- `node scripts/test-mobile-registration.mjs` — passed; all ten shared questionnaire categories render business/details/documents/review, with inert backend dependencies. Also checks keyboards, choices, progress, footer measurement, input/button accessibility and option filtering.
- `node scripts/test-application-navigation.mjs` — passed; all eleven service destinations survive authentication transitions, unsafe redirects rejected.
- Production web export — passed.
- `REGISTERBOX_SEARCH_BUILD_DIRECTORY=/tmp/registerbox-local-search-preview node scripts/test-local-search.mjs` — 15/15 passed.
- Chrome responsive checks at 320, 390, 768 and 1440 pixels. Service and sign-in pages had no horizontal document overflow at checked narrow widths. Inspected service search, application destination, mobile sign-in, and tablet/desktop presentation.
- A temporary, local-only UI fixture exercised shared registration controls without an account: blank-name validation, name entry, radio selection, searchable state selection and document layout. No application saving, uploads, OTPs or submissions occurred. Fixture source was removed before the final export.
- The 320px check exposed a wrapped progress label; visible “Documents” was shortened to “Docs”, while its accessible progress value remains “Documents”.

## Limits / handoff

This is a local preview at http://localhost:8087/services, not a production deployment. Physical iOS/Android devices and their software keyboards have not been tested; browser viewport checks do not substitute for that. The application-screen tests are isolated renders, not authenticated database submission tests.

Evidence is in `docs/screenshots/`: `services-mobile-final.png`, `gst-service-mobile-final.png`, `sign-in-mobile-final.png`, and `mobile-registration-documents.png` (explicitly labelled local fixture).

Expo development mode showed module-loading errors; the final preview uses the successfully compiled web export instead. No unrelated runtime/bundler changes were made.
