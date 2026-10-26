# Search growth review — 26 October 2026

## Evidence before changes

The supplied query CSV has 251 unique queries, 592 query-row impressions and 7 clicks (1.18% CTR). Six clicks are branded and one is for LLP registration in Bangalore. Of the 251 queries, 181 have only one or two impressions. The `Reason` column is empty; the third-party `Next step` and `Extra clicks` fields are recommendations and estimates, not observed causes or forecasts.

Live Search Console, checked on 26 October under the www HTTPS property, shows 18 clicks, 1.51K impressions, 1.2% CTR and average position 14.3 with the three-month control selected. The chart contains dates 11–24 October. These property totals are not the smaller sum of exported visible query rows. The CSV has no date, page, device or country columns. Do not label its calculated weighted query position as the property position or assume a confirmed ten-day window.

Query-to-page checks in Search Console identified the actual opportunities:

| Exact query | Query impressions | Query average position | Observed landing page |
| --- | ---: | ---: | --- |
| what is gstr 3b | 25 | 9.5 | `/hi/blog/gstr-1-vs-gstr-3b` (25 page impressions) |
| shop and establishment registration karnataka | 14 | 8.7 | `/blog/shop-and-establishment-registration-process` (14 page impressions), plus the Karnataka overview (1) |
| legal ownership document in gst means | 12 | 9.2 | `/blog/gst-registration-documents-and-address-proof` (12 page impressions) |

Page-level impressions can exceed property-level impressions when multiple results appear. These observations do not establish a harmful cannibalization problem or fixed live ranks.

## Diagnosed opportunities

- The Hindi GSTR-1/GSTR-3B page was visible for a definition query. Its opening needed to explain GSTR-3B directly, not just lead with a comparison. English and Hindi now answer meaning, sales versus purchases, eligible ITC, reverse charge and filing proof.
- The GST document page did not directly define the phrase people searched for. It now distinguishes premises ownership from the applicant's identity, with owned/rented/consent evidence and CBIC's specific tenancy distinctions.
- Karnataka guidance needed clearer official login, document, fee, acknowledgement and certificate answers. The existing process URL stays the primary step-by-step guide. The companion overview focuses on applicability, existing accounts and certificates; no duplicate location landing pages were created.
- LLP and GST service pages used generic headings and snippets despite real Bengaluru branches. They now describe the local service, relevant documents and next steps, linking to the existing branches and detailed guides. FSSAI was already substantial, so changes there are limited to clearer local metadata and introductory wording.
- Important guides now have contextual links within the relevant sections and homepage feature links. Link labels use the destination's translated title when that language is available.
- Actual edit/review dates were not represented separately from publication. Modified content now gets truthful schema, feed and sitemap dates. Unchanged translations do not inherit a false English review date. Publication dates remain unchanged.

Public service checks returned HTTP 200, index/follow and correct self-canonicals; there was no evidence of a general crawl block on those pages. Existing maps, reviews, registration routes, prices, payment controls and the video-first page are preserved.

Source-link testing returned HTTP 200 for 13 of 15 checked official URLs. The old, unused Shram Suvidha integration reference failed automated retrieval and was removed in favour of the verified direct department sources. The India Code PDF timed out; the MCA PDF restricts automated access. Those responses are not proof that the underlying documents are missing.

## Research basis

- [Google: descriptive, concise title links](https://developers.google.com/search/docs/appearance/title-link)
- [Google: useful page-specific snippets](https://developers.google.com/search/docs/appearance/snippet)
- [Google: people-first content and trustworthy evidence](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google: crawlable contextual links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)
- [Google: AI features have no special markup or file requirement](https://developers.google.com/search/docs/appearance/ai-features)
- [Google: accurate sitemap modification dates](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google: Search Console metric definitions](https://support.google.com/webmasters/answer/7042828?hl=en)
- [Google: relevance, distance and prominence in local ranking](https://support.google.com/business/answer/7091?hl=en)

Each amended compliance page links its official GSTN, CBIC, Karnataka Labour or MCA sources next to the relevant guidance. An outbound official reference is not an inbound backlink. No fake credentials, fabricated reviews, purchased links, keyword stuffing or guaranteed rankings were added.

## What still needs business work

1. Keep both real Google Business Profiles accurate: business name, category, address, phone, hours and website. Verify any missing ownership through the normal process; no profile mutations were made in this release.
2. Invite genuine customers to leave honest reviews without incentives or scripted claims. Seek relevant independent mentions through actual business relationships, useful original resources and local organisations. Do not buy ranking links.
3. Document real, permissioned examples of work completed, service scope and verified reviewer qualifications. Do not invent a CA/CS reviewer or guaranteed approval speed.
4. Prioritise the FSSAI fee-query cluster in a separate effective-date review: the site already has sourced 2026 fee/category guidance, while these queries are much further from page one. More duplicate posts are not the default remedy.

## Measurement

Use a 28-day baseline and an equal 28-day post-release window, keeping the same property, search type, country/device and query/page filters. Track non-brand clicks, impressions and CTR for the three priority clusters; review query-to-page mapping and average position without treating it as a fixed rank. Separately measure calls, application starts and completed applications. A ten-day new-site sample cannot support a guaranteed top-two ranking or a reliable CTR-lift forecast.

Request recrawling only after the amended HTML is live. A sitemap helps discovery; it does not guarantee indexing or ranking. Allow Google to recrawl and assess before judging the changes. No recurring monitoring task was created.

Verification covers all 94 static articles, four languages, original publication dates, actual modification dates, existing prices, page/asset/telephone links, canonicals, reciprocal language alternates and the video-first page. The generic ecommerce discovery checker expects product-feed API files this service website does not use; its product-specific warnings are not applicable and were not addressed by inventing merchant products.
