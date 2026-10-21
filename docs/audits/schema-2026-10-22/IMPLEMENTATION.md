# Implementing the RegisterBox JSON-LD package

## 1. Choose the correct graph for the exact canonical URL

Use `page-manifest.json` or `page-inventory.csv`. For example:

| Live URL path | Complete replacement JSON-LD |
|---|---|
| `/` | `jsonld/home.jsonld` |
| `/contact` | `jsonld/contact.jsonld` |
| `/services` | `jsonld/services.jsonld` |
| `/services/gst-registration` | `jsonld/services__gst-registration.jsonld` |
| `/blog` | `jsonld/blog.jsonld` |
| `/blog/gstr-3b-filing-process-online` | `jsonld/blog__gstr-3b-filing-process-online.jsonld` |
| `/blog/editorial-policy` | `jsonld/blog__editorial-policy.jsonld` |
| `/policies` | `jsonld/policies.jsonld` |
| `/privacy` | `jsonld/privacy.jsonld` |
| `/delete-account` | `jsonld/delete-account.jsonld` |

Each file includes its own Organization, logo, WebSite, WebPage and applicable page entities. **Replace the page's existing graph with the mapped graph.** Appending the complete replacement to the old graph would create redundant or conflicting definitions. Multiple JSON-LD scripts are legal, but no duplicate full graph is needed here.

Use the `.html` counterpart for a literal HTML integration. In React, render the raw JSON object once through the existing web-only SEO component instead of injecting a second script wrapper. A script may be in the document head or body; the current placement outside Head is not by itself a defect.

## 2. Integrate shared entities into the existing web templates

The project uses Expo SDK 57 and Expo Router. The matching [SDK documentation](https://docs.expo.dev/versions/v57.0.0/) and [current Expo docs index](https://docs.expo.dev/llms.txt) were consulted. Keep reusable schema logic outside `src/app/`, and restrict HTML script rendering to the web implementation.

Suggested implementation locations:

1. `src/components/website/seo.web.tsx`: own the shared Organization, ImageObject, WebSite, canonical page node, stable IDs and a single serializer. Keep ordinary title/description/canonical metadata in the existing Head integration.
2. `src/components/website/landing.web.tsx`: identify the homepage, organization and described web application. Build its FAQ section from the same data used for visible FAQs.
3. `src/components/website/contact.web.tsx`: ContactPage and the documented physical office. Include location data only where the location is represented on the page. Confirm a second office before exposing it.
4. `src/components/website/service-page.web.tsx`: Service IDs, page relationships and three exact assistance Offers. Keep price, exclusions and visible copy sourced from the same service data object.
5. `src/app/services/index.web.tsx`: CollectionPage plus the ItemList that matches the displayed service list.
6. `src/components/website/blog-index.web.tsx`: CollectionPage, Blog and the live article list.
7. `src/components/website/blog-article.web.tsx`: BlogPosting → shared author/publisher; per-article dates; full WebPage relationships; visible FAQ section. Keep all currently live articles and citations.
8. `src/app/blog/editorial-policy.web.tsx`, `src/app/policies.web.tsx`: AboutPage/WebPage and breadcrumbs.
9. `src/app/privacy.web.tsx`, `src/app/delete-account.web.tsx`: add metadata for their public informational content if that content is intentionally indexable. Do not emit personal account/request data into structured data.

The working tree has pre-existing changes and differs from production. Use the production page manifest as a release coverage check. Do not overwrite current live contact details, articles or service routes using stale local data.

## 3. Serialize safely and keep facts synchronized

This web-only React rendering pattern escapes literal `<` so visible text cannot terminate the script element:

```tsx
const jsonLdText = JSON.stringify(graph).replace(/</g, '\\u003c');

return (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: jsonLdText }}
  />
);
```

Use an actual JavaScript object for `graph`, not a string that already contains `<script>` markup. Do not HTML-entity encode JSON quotes or wrap the data in JavaScript assignment syntax.

- Preserve `https://www.registerbox.in` consistently. Keep the homepage trailing slash and current internal-page canonical paths.
- Keep entity IDs stable across releases. `@id` fragments identify graph entities; they need not each have a matching HTML `id`.
- Drive visible prices and Offer fields from one data record. Current values describe assistance fees, not the final government/tax-inclusive cost. Do not mark Udyam or an entire application workflow free from a government-fee statement.
- Update dateModified only after a substantive page update. Keep the actual publication date. Date-only values are valid when exact times are not recorded.
- Keep FAQ questions/answers aligned with rendered content, including disclosure lists. Expanding/collapsing an answer is compatible with making it available to visitors.
- Add equivalent breadcrumb navigation to the five sitemap pages receiving new trails, and utility pages if used, so users see the same hierarchy.
- Omit unverified social profiles, hours, precise coordinates, legal company identifiers, professional memberships and review totals.

## 4. Use optional types only when their content applies

**Product:** The three `optional-product/*.jsonld` files are complete alternatives to their corresponding default service graphs. Each uses one entity with `@type: ["Service", "Product"]`, preserving its actual assistance fee and exclusions. Use one default or one alternative, never both. Service-only is clearer for the current professional-assistance offering. Neither option promises Shopping eligibility.

**FAQPage:** `conditional-future-page/faqs.jsonld` is prepared for a proposed `/faqs` page and copies six real homepage Q&As. It is deliberately outside the deployable current-page set. Publish a real page with that content and its canonical metadata before using it. The current service/article graphs describe FAQ sections as WebPageElement and keep Service/BlogPosting as their main entity. Google FAQ rich results have been retired.

**SoftwareApplication:** The homepage graph's WebApplication is semantic markup. Do not add `offers.price: 0` merely because sign-in is free, or borrow organization testimonials as app reviews to satisfy Google's app-rich-result requirements.

## 5. Build and verify before release

No dependencies or native project changes are needed to emit JSON-LD. In this checkout the npm lockfile is present and no root Bun lockfile was found:

```bash
npx expo lint
npx tsc --noEmit
npx expo export --platform web --output-dir /tmp/registerbox-schema-preview
python3 scripts/check-public-seo.py /tmp/registerbox-schema-preview
```

Use the existing static output configuration. Expo's [static rendering guide](https://docs.expo.dev/router/web/static-rendering/) describes production export. The audit already ran lint and typecheck successfully; the export commands above are the integration verification steps, not a claim a release build was created in this audit.

Inspect the actual exported HTML for every public route. Check each JSON-LD script parses, page-specific data is correct, no second graph survives route transitions, and no private pages inherit public promotional markup. The existing `check-public-seo.py` only checks basic SEO presence; extend the integration checks to verify graph identities and actual page content, rather than treating that script as full schema validation.

Regenerate and validate this snapshot package independently:

```bash
python3 docs/audits/schema-2026-10-22/build-jsonld.py
python3 docs/audits/schema-2026-10-22/validate.py
```

For official vocabulary type/property domain checks, download [the current Schema.org JSON-LD vocabulary](https://schema.org/version/latest/schemaorg-current-https.jsonld) and pass its local filename as the validator's first argument. `crawl.py` refreshes the public HTML snapshot over the network; review business facts after refreshing before regenerating the graphs.

## 6. Validate search features after integration

1. Test representative homepage, contact, service, archive and article graphs in [Schema.org Validator](https://validator.schema.org/). This checks general vocabulary, including Service and WebPageElement.
2. Test supported Google features in [Rich Results Test](https://search.google.com/test/rich-results). A Service-only page showing no dedicated rich-result feature is not automatically an invalid Schema.org implementation. Do not expect retired FAQ results.
3. Inspect both direct page loads and client navigation on mobile and desktop. Verify the rendered graph has no duplicate page/organization identities and all visible facts remain consistent.
4. Once deployed, use Search Console URL Inspection to confirm Google can fetch the page and render the graph. Check canonical selection, robots status and image access.
5. Keep the sitemap aligned with the deployed route inventory. Add `/privacy` and `/delete-account` only if their public information is intended for indexing; account/request interfaces can remain noindex. JSON-LD is not a substitute for this indexing decision.
6. Monitor relevant breadcrumb/article/organization or product reports where Google provides them, together with indexed pages and search performance. Interpret changes over time; do not attribute all traffic movement to schema.

The supplied files are generated and locally validated. Application integration, browser navigation checks, Google tests and deployment are the remaining implementation steps.
