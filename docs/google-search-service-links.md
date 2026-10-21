# RegisterBox organic Google service links

Prepared 21 October 2026. Scope: free organic search visibility only. No Google Ads campaign is requested or configured.

Google calls the extra links beneath a search result “sitelinks”. The supplied screenshot is a paid ad, but organic results can also show sitelinks. Organic sitelinks are chosen automatically for each query. Site owners cannot choose a fixed set, force the layout or guarantee an appearance date. Structured data and a sitemap do not buy or guarantee this format.

## Changes prepared locally

- Added a public `/services/free-nil-gst-filing` landing page describing the ₹0 RegisterBox service fee for eligible nil GSTR-1/GSTR-3B returns.
- Added the free nil service to the public catalogue and homepage service search.
- Linked all public service categories from the homepage using descriptive service names.
- Connected the regular GST returns page with the free nil offer and linked back to regular return support from the new page.
- Added the new canonical URL to the sitemap and public service index.
- Kept the nil workflow behind the existing account, GSTIN, period, eligibility and authorization steps.

These source changes require deployment before the new URL is available to Google. Do not treat local checks as evidence of indexing.

## Intended service destinations

| Service | Canonical URL |
| --- | --- |
| GST registration | https://www.registerbox.in/services/gst-registration |
| Free nil GST filing | https://www.registerbox.in/services/free-nil-gst-filing |
| GST return filing | https://www.registerbox.in/services/gst-returns |
| Company registration | https://www.registerbox.in/services/private-limited-company-registration |
| LLP registration | https://www.registerbox.in/services/llp-registration |
| FSSAI and food licence | https://www.registerbox.in/services/fssai-food-business |
| Shop and establishment | https://www.registerbox.in/services/shop-establishment-registration |
| Trademark application | https://www.registerbox.in/services/trademark-registration |
| Start a business | https://www.registerbox.in/services/start-a-business |
| Online business setup | https://www.registerbox.in/services/online-ecommerce-business |
| Manufacturing setup | https://www.registerbox.in/services/manufacturing-business |
| Open a new branch | https://www.registerbox.in/services/business-branch |
| Business compliance check | https://www.registerbox.in/services/business-compliance-check |

This list covers the public service catalogue. It is not a promise that Google will display all services together. Do not add other filing services that RegisterBox has not confirmed it offers.

## After deployment

1. Confirm the new public URL returns HTTP 200 while signed out. Check the initial HTML has one H1, one canonical, a useful title and description, the offer and service links. Verify mobile layout and the sign-in destination.
2. In the existing Google Search Console property for `https://www.registerbox.in`, submit or resubmit `https://www.registerbox.in/sitemap.xml`. Use the intended owner account and do not create a duplicate property unnecessarily.
3. Use URL Inspection for the homepage, services directory, GST registration, GST return filing and new free nil filing page. Check indexing eligibility and Google's selected canonical, then request indexing where appropriate.
4. Monitor the Pages and Performance reports for crawl errors, indexing exclusions, impressions, queries, clicks and customer enquiries. An indexing request is not proof that a page is indexed.
5. Keep service descriptions accurate and distinct. Link to them from relevant guides and retain accessible navigation. Improve pages using real search queries and customer questions.

Search Console is required to confirm Google's actual indexing state. This local work does not establish property ownership, submit a sitemap, request indexing or confirm a sitelink appearance. No guaranteed ranking or timeline is offered.

## Offer wording

“Free nil GST filing” means ₹0 RegisterBox service fee for eligible nil returns. Eligibility depends on complete books, portal records, the selected return, period and filing status. No sales alone does not establish nil eligibility. Government dues are not waived, and any separate work needs its own agreed scope.

## Sources

- [Google Search Central: Sitelinks](https://developers.google.com/search/docs/appearance/sitelinks) — automatic selection, descriptive page titles and logical internal links.
- [Google Search Central: Sitemap overview](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview) — discovery and sitemap limitations.
- [Google Search Console: URL Inspection](https://support.google.com/webmasters/answer/9012289) — inspect actual indexing state and request indexing.
- [GSTN: GSTR-3B guidance](https://tutorial.gst.gov.in/userguide/returns/GSTR3B.htm) — nil-return eligibility and outstanding liabilities.

## Verification

- `npx expo lint`: passed.
- `npx tsc --noEmit`: passed.
- Static web export: passed; new landing page is rendered in initial HTML.
- All 16 service landing pages pass H1, canonical and indexability checks; homepage links cover all 13 catalogue categories.
- Browser: verified 390px mobile layout without horizontal overflow, directory search for “nil”, and sign-in redirect preserving `/gst`.
- In the combined working tree, the full-site SEO checker flags pre-existing multiple H1 headings on `/policies`. The isolated commit snapshot retains baseline metadata issues on `/policies` and missing noindex markers on four private routes; none of those files is changed by this commit. Changed service pages pass their metadata, heading, canonical and internal-link checks.
- The isolated commit snapshot also passes Expo lint, TypeScript and a fresh static web export without requiring other uncommitted work. The separate uncommitted blog work and its reciprocal nil-service link remain outside this commit.
- Not deployed; no Search Console actions or indexing claims.
