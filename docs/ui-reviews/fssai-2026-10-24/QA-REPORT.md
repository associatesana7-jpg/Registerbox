# FSSAI public page QA

24 October 2026. Actual clean-release source exported to `/private/tmp/registerbox-fssai-release-build`; served read-only on loopback at http://127.0.0.1:4179/services/fssai-food-business. Workspace preview4178 remains separate. No authentication or production data was used.

The FSSAI export assertions pass: one H1, canonical/indexability, registration-first category=food actions, static ₹1,999 price, one eligible Basic case/premises and included first-year government-fee scope, separate State/Central quotes, later-fee disclosure, stable package/process anchors, one Service/Offer at1999INR, BreadcrumbList, WebPage modification date, and12 readable FAQs matching their JSON-LD answers. Public feed contains14 packages with the unchanged nonfood amounts. Sitemap lastmod is2026-10-24, llms price/scope agree, and both food guides have exported English/Hindi/Kannada/Tamil crosslinks.

Browser checks covered1440×900,1024×768,390×844 and360×800 with JavaScript disabled. The page, price, category comparison and FAQ answers exist before hydration. Root and main widths match at all four sizes, with no horizontal overflow. A separate fresh anonymous context hydrated the exported page successfully: correct H1,₹1,999 price,12FAQs and package inclusions. All runs recorded zero attempted external requests, zero page errors and zero failed local responses. CSP and browser routing blocked external service access; no form or payment was submitted.

Initial mobile review found a cramped hero CTA and a split Registration word in the table. After the final CSS export,390px and360px captures were repeated. Both hero actions now fill their own row with48px or greater height; the arrow stays inside the primary button. Registration remains an intact word in the first table column. The fixed bar’s complete Basic · govt fee included label fits at both sizes, and overscroll containment is active. At the end of the page, legal links end at763.7px before the bar begins774px on390×844; on360×800 the final legal link ends720.4px before the bar begins730px. No footer overlap.

FAQ keyboard verification: Enter opens the native disclosure; Space closes it; focus remains on the summary with a visible2px solid outline. Mobile summary controls have64px minimum height. Reduced-motion preference was enabled. Screenshots were inspected for price legibility, table wrapping, CTA fit and FAQ readability.

Evidence:

- `fssai-desktop.png`, `fssai-category-desktop.png`, `fssai-pricing-desktop.png`
- `fssai-mobile390.png`, `fssai-mobile360.png`, `fssai-category-mobile360.png`, `fssai-pricing-mobile390.png`
- `fssai-faq-mobile390.png`, `fssai-footer-mobile390.png`, `fssai-footer-mobile360.png`
- `qa-static-and-hydrated.json`, `qa-mobile-final.json`, `source-checksums.json`

This checks exported content, UI behaviour and machine-readable consistency. Live authority eligibility, production payment/provider acceptance, physical mobile keyboards and filing outcomes were not exercised. Root owns the final application/payment-guard tests, lint/typecheck and release operations. Temporary browser scripts and fixtures stay outside the repository.

Final source checks after the package-scope guard: Expo lint, full TypeScript check, static export and all 61 tests across ten relevant scripts passed. Service, public SEO, English/Hindi and four-language article checks were rerun successfully. The guard uses a conservative owner-bound saved-intake check; valid Basic and quoted routes, malformed/legacy/mismatched drafts, direct-purchase bypass and older stored payment amounts were covered with synthetic fixtures. No live payment or database mutation was performed.
