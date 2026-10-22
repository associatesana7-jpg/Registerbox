# RegisterBox Schema.org and JSON-LD audit

**Date:** 22 October 2026, Asia/Kolkata. **Canonical origin:** https://www.registerbox.in.

## Executive finding

RegisterBox already has valid, useful structured data. All **41 sitemap URLs returned HTTP 200**, had matching canonical links, and each contained one parseable JSON-LD graph in server-delivered HTML. There is no evidence of a sitewide malformed-JSON failure. The principal opportunities are a more complete business identity, explicit page relationships, commercial fee information, and page-purpose coverage.

The live site contains **13 Service nodes, 22 BlogPosting nodes, 35 BreadcrumbLists, one WebSite and one CollectionPage** as top-level entities. Organization is present on every sitemap page. The 22 embedded article `WebPage` objects are skeletal references, rather than full page descriptions. These are semantic enrichment gaps, not proof that Google cannot understand or rank the pages.

The audit also checked `/privacy` and `/delete-account`, public pages linked from the site. Both returned HTTP 200 but lack JSON-LD, canonical links and a robots meta tag. Absence of a robots meta tag alone does not prevent indexing. Their public instructions should be distinguished from any signed-in processing interface.

All changes below are prioritized by likely practical benefit for this particular service business; this is a reasoned prioritization, not a measured forecast of ranking or traffic gains. Valid structured data can clarify meaning and support eligible search presentation; it does not guarantee rich results. [Google structured-data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)

## Scope and evidence

- Crawled every URL in the live [sitemap](https://www.registerbox.in/sitemap.xml), plus the two linked public utility pages: **43 successful public HTML pages**.
- Parsed every detected `application/ld+json` script and inspected the surrounding visible content, metadata, fees, FAQs, author bylines, publication dates, images and links.
- Probed four additional routes present only in the local checkout: `/services/free-nil-gst-filing`, `/services/business-licence-bengaluru`, `/services/business-licence-new-thippasandra`, `/services/business-licence-marathahalli`. Their fetches raised HTTP 404. They are excluded from the current production graph set.
- Checked all nine unique images used by current schema/Open Graph metadata: seven article images, the logo and the business OG image. All returned HTTP 200 with image content types. The schema logo was independently checked as **192 × 192 PNG**.
- Checked robots.txt and HTTP/non-www variants. The variants resolved to the canonical HTTPS/www homepage. Robots.txt allows crawling.
- Compared the local SEO templates to production. They differ materially: local sitemap 35 URLs versus live 41, different email addresses and additional local branch claims. Local-only observations are labeled separately below.
- This is an unauthenticated server-HTML and source audit. It does not claim exhaustive knowledge of unlinked URLs, signed-in pages, post-hydration navigation behavior, Search Console state or Google's selected canonical. No Rich Results Test or Search Console session was run.

## Prioritized findings

### 1. Complete the business and office identity — high relative impact

**Observed:** The [contact page](https://www.registerbox.in/contact) emits Organization only. It visibly lists an office in New Thippasandra but has no LocalBusiness or ContactPage. The shared Organization street omits the visible BBMP Ward, HAL Aerospace Division and New Thippasandra address context. The shorter address is consistent with the page; it is incomplete, rather than demonstrably false.

**Why this matters:** Consumers receive a brand and partial mailing address without an explicit physical operating location or page contact purpose. They must infer the relationship among the office, service provider and website. This is particularly relevant to local business enquiries.

**Fix supplied:** Enrich Organization with the currently published complete address, normalized phone, ContactPoint and publishing policy. On `/contact`, add ContactPage and a LocalBusiness with a stable location ID, physical address, parentOrganization and the map link that the page actually exposes. Do not publish the local checkout's second branch, precise coordinates or replacement Gmail address without confirming and displaying those facts on production.

Organization has no universally required Google properties; these are useful identity enrichments. Google LocalBusiness requires a business name and physical address for the supported feature. Keep the office record aligned with the real business and its public listing; markup alone does not verify a location. [Organization guidance](https://developers.google.com/search/docs/appearance/structured-data/organization), [LocalBusiness guidance](https://developers.google.com/search/docs/appearance/structured-data/local-business)

### 2. Connect each page, website and main entity — high semantic impact

**Observed:** Homepage WebSite has a name and URL but no `@id` or publisher. Most pages have no explicit WebPage node. Each of the 13 Services lacks an `@id`; Service → provider is already correctly linked. Article mainEntityOfPage currently supplies only a WebPage type and URL ID. Directory entities are anonymous.

**Why this matters:** A consumer can see independent facts but lacks a consistent graph expressing which organization publishes the website, which document belongs to that website, and which service or article that document primarily describes. Anonymous entities are valid, but stable IDs make references and deduplication more dependable.

**Fix supplied:** Keep the existing `/#organization` and article `#article` IDs. Add `/#website`, canonical-page `#webpage`, service-page `#service`, `#breadcrumb` and directory `#list` IDs. Connect WebPage.isPartOf → WebSite, WebSite.publisher → Organization, and WebPage.mainEntity → Service/BlogPosting/ItemList. Repeat consistent shared definitions in each self-contained graph. WebSite remains relevant for Google's site-name feature. [Google site names](https://developers.google.com/search/docs/appearance/site-names), [Schema.org WebPage](https://schema.org/WebPage)

### 3. Encode the three visible assistance fees — medium commercial impact

**Observed:** These prices appear visibly but are absent from their Service nodes:

| Page | Published RegisterBox assistance fee | Important scope |
|---|---:|---|
| `/services/gst-registration` | INR 199 | Government charges and applicable taxes separate. |
| `/services/fssai-food-business` | INR 3,999 | Government charges and applicable taxes separate. |
| `/services/shop-establishment-registration` | INR 4,500 | Government charges and applicable taxes separate. |

**Why this matters:** The structured representation omits the commercial offer and fails to distinguish the provider's assistance fee from the total cost of an official registration. A parser must recover the fee and limitations from prose.

**Fix supplied:** Each of these Services links to an Offer with price, INR currency, seller, itemOffered, canonical URL and the visible fee exclusions. Quotes remain quotes: no invented zero-price, availability, expiry dates or total government fees are emitted. In particular, live Udyam content describes paid assistance without a fixed numeric quote; the government's zero filing fee must not be substituted for RegisterBox's fee.

Service is the recommended primary model. Google does not list a dedicated generic Service rich result; these Offers improve semantic coverage rather than guaranteeing price snippets. [Schema.org Service](https://schema.org/Service), [Google supported structured-data features](https://developers.google.com/search/docs/appearance/structured-data/search-gallery)

### 4. Complete internal-page purposes and breadcrumbs — medium impact

**Observed:** Services directory has ItemList but no CollectionPage. Contact, policies and editorial-policy pages have only Organization. Blog archive has a CollectionPage but lacks website/publisher/breadcrumb relationships. Five sitemap pages lack BreadcrumbList: `/contact`, `/policies`, `/services`, `/blog`, `/blog/editorial-policy`. The homepage does not need a one-item breadcrumb.

**Why this matters:** The graph does not distinguish a contact endpoint, service collection, editorial transparency document and policy page. Missing breadcrumbs remove an explicit hierarchy on those pages; they do not invalidate the existing breadcrumbs on the other 35 pages.

**Fix supplied:** ContactPage, CollectionPage for both directories, AboutPage for editorial policy, ordinary WebPage for policies, and sensible internal breadcrumbs. The public privacy/deletion pages also receive WebPage descriptions and breadcrumbs if retained as indexable public information. Expose equivalent navigation to users when integrating the new breadcrumbs. [Google breadcrumbs](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb), [Schema.org page types](https://schema.org/WebPage)

### 5. Strengthen article identity and update maintenance — medium to low impact

**Observed:** All 22 articles already provide headline, description, a relevant image URL, datePublished, dateModified, language, publisher, organization author, citations and breadcrumbs. Their author is an anonymous Organization named RegisterBox rather than a reference to the existing publisher ID. Publication/modified dates match the visible dates; they are not shown to be wrong.

**Why this matters:** Consumers need to reconcile two descriptions of the same editorial organization. A skeletal page reference misses explicit page-to-website and article-to-blog relationships. Reusing publication dates indefinitely for modification metadata would conceal future substantive updates.

**Fix supplied:** Reuse the RegisterBox organization ID for author and publisher, add Blog and complete page nodes, preserve all observed per-article dates/images/citations, and connect to the editorial policy through Organization.publishingPrinciples. Keep actual publication and modification fields per article in the implementation. Preserve date-only precision when that is all the record establishes; do not invent midnight timestamps or author credentials.

Google Article has no required properties; the present article markup is already substantially complete. Multiple image aspect ratios and more distinct editorial illustrations can be future improvements when real assets exist, not emergency validation fixes. [Google Article guidance](https://developers.google.com/search/docs/appearance/structured-data/article)

### 6. Describe the real software workspace — low to medium semantic impact

**Observed:** Homepage explains the business workspace and its features without identifying the software separately from the organization and website.

**Fix supplied:** A modest WebApplication node, a subtype of SoftwareApplication, with the actual name, homepage, BusinessApplication category, publisher and supported feature description. No unsupported operating-system versions, price, ratings, review counts or app-store identifiers are invented. No rich-result eligibility is claimed: Google's application feature has additional price/review requirements. [Schema.org WebApplication](https://schema.org/WebApplication), [Google software-app guidance](https://developers.google.com/search/docs/appearance/structured-data/software-app)

### 7. Represent visible FAQs without changing page identity — low SEO priority

**Observed:** There are **132 visible question/answer occurrences** across 36 pages: six on homepage, four on each of 13 service pages, and 74 across 22 articles. None has Question/Answer structured data. Service answers include checklist bullets; the supplied graphs preserve those as well as paragraph text.

**Why this matters:** Questions and answers remain understandable as prose, but the graph does not explicitly associate each question with its answer.

**Fix supplied:** A WebPageElement for the FAQ section, with Question and acceptedAnswer nodes, linked from its parent WebPage.hasPart. This keeps the actual primary service/article as WebPage.mainEntity. FAQPage is reserved in this package for a dedicated FAQ-led page; a clearly separated conditional `/faqs` example is supplied using the homepage's real Q&A content. Do not install that example on a nonexistent page.

This is a modeling choice, not a claim that FAQPage is forbidden on mixed-content pages. Most importantly, Google stopped showing FAQ rich results starting **7 May 2026**. Do not prioritize this work on the basis of the older government/health-only eligibility rule or a promise of expanded FAQ snippets. [Google's current updates](https://developers.google.com/search/updates), [FAQPage](https://schema.org/FAQPage), [WebPageElement](https://schema.org/WebPageElement)

## Product and other requested schema: applicability

| Type | Decision for this site |
|---|---|
| Organization | Present; enrich verified business identity. |
| WebSite | Present on homepage; make it linkable and connect publisher. `Nebsite` is not a Schema.org type. |
| WebPage | Add complete nodes across public pages, with appropriate subtypes. |
| BreadcrumbList | Retain 35 existing trails; add the five missing sitemap-page trails and the public utility-page trails. |
| Article / BlogPosting | Retain BlogPosting on all 22 editorial articles. BlogPosting already inherits Article; a duplicate Article node is unnecessary. |
| Service | Appropriate primary model for all 13 service landing pages. |
| Offer | Add on the three pages with explicit assistance fees. Do not turn an unspecified quote into zero. |
| LocalBusiness | Add one documented physical location to contact. Do not fabricate additional branches, opening hours, coordinates, priceRange or certifications. ProfessionalService is a deprecated general-purpose type; plain LocalBusiness is appropriate without verified specialist credentials. |
| Product | Not a missing mandatory feature. Schema.org Product explicitly includes offered services. Three optional complete Service/Product alternatives are supplied for the visibly priced offerings. Use only if these pages intentionally represent defined assistance packages. A Product node does not make tax/accounting services eligible for Shopping. |
| FAQPage | Conditional dedicated-page example; default current-page FAQs use WebPageElement with Questions. |
| SoftwareApplication | Homepage WebApplication subtype supplied, with no fabricated price or review data. |
| ContactPage / AboutPage / CollectionPage / Blog / ImageObject / ItemList / Question / Answer / ContactPoint | Included where their actual role applies. |
| SearchAction | Not necessary: no working sitewide query endpoint was established. A service-filter UI is not automatically a public search URL. Google's sitelinks search box retired in November 2024. |
| Review / AggregateRating | No reliable item-specific rating dataset established. Do not invent stars or transfer company reviews to a Product/app. Self-serving Organization/LocalBusiness ratings do not qualify for Google's review-star feature. |
| GovernmentOrganization / GovernmentService / LegalService / AccountingService | No basis to claim government status or regulated professional credentials from the current evidence. Independent application assistance should not be represented as the issuing authority. |
| HowTo / VideoObject / Event / JobPosting / merchant shipping and return policies | No applicable standalone content or offer established for this audit. Do not add types simply to increase schema count. |

Product snippets have their own eligibility rules, and Merchant Center separately excludes labor/expertise services, including accounting. Missing Shopping eligibility is not a Schema.org syntax error. [Schema.org Product](https://schema.org/Product), [Google Product snippets](https://developers.google.com/search/docs/appearance/structured-data/product-snippet), [Shopping services policy](https://support.google.com/merchants/answer/6150006?hl=en), [Review rules](https://developers.google.com/search/docs/appearance/structured-data/review-snippet), [Search-box retirement](https://developers.google.com/search/blog/2024/10/sitelinks-search-box), [ProfessionalService status](https://schema.org/ProfessionalService)

## Local checkout findings — not current production defects

The following concern integration readiness in the working tree and should not be reported as live failures:

- `src/components/website/seo.web.tsx` uses `registerboxindia@gmail.com`, includes both branches on many service pages, and associates one Google profile with the parent and a specific branch. Production currently exposes Yahoo email and only the New Thippasandra contact address. Resolve the business source of truth before replacing public identity data.
- `src/components/website/service-page.web.tsx` places dateModified on Service. Schema.org expects that property on CreativeWork/DataFeedItem; move it to WebPage. **Live Service nodes do not contain this issue.** [dateModified](https://schema.org/dateModified)
- `src/components/website/blog-article.web.tsx`, `src/data/blog/index.ts` and `seo.web.tsx` use shared publication metadata in the local snapshot. The live graph already distinguishes October 20/21 articles. Preserve that distinction when implementing actual per-article update fields.
- Four local landing pages are currently unpublished/404 in production. The production site also has Udyam plus nine articles absent from the local sitemap. Reconcile route/data coverage before building a release; do not replace the larger production inventory with the smaller local inventory.

## Delivered coverage and validation

The manifest contains one complete replacement graph for each of the **43 observed public pages**, with both JSON and ready-to-insert HTML script forms. It includes all 22 live articles and all 13 live services, rather than giving a single generic template and leaving page-specific data unresolved. See `page-inventory.csv` for every URL.

Local validation checks JSON parsing, canonical/page IDs, page-to-website relationships, local entity references, exact visible Q&A text, prices and exclusions, article metadata parity, escaped HTML round trips, and type/property domains against the downloaded official Schema.org vocabulary. **47 graphs** were checked including the three optional Product variants and one conditional future FAQPage. All local checks passed; see `validation-results.json` for the exact count and time.

Project `npx expo lint` and `npx tsc --noEmit` also passed. These checks do not replace the post-integration Google Rich Results Test, rendered-page review and Search Console URL inspection described in `IMPLEMENTATION.md`.
