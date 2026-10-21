# RegisterBox structured-data audit and implementation package

Audited **22 October 2026 (India time)**. Confirmed domain: **https://www.registerbox.in/**. The originally typed `regiserrbox.in` did not resolve; the user confirmed `registerbox.in`.

Start with [AUDIT.md](AUDIT.md), then [IMPLEMENTATION.md](IMPLEMENTATION.md).

| Deliverable | Contents |
|---|---|
| `jsonld/` | **43 complete, page-specific replacement graphs**, each as raw `.jsonld` and an escaped `<script>` `.html` snippet. Covers all 41 live sitemap URLs plus `/privacy` and `/delete-account`. |
| `page-manifest.json` | Exact URL → raw JSON-LD/snippet mapping and included types. |
| `page-inventory.csv` | Page-by-page existing coverage and replacement mapping. |
| `optional-product/` | Three complete alternative graphs using `Service` + `Product` for the three visibly priced assistance offerings. These replace, rather than accompany, the default graph. Service-only is the recommended default. |
| `conditional-future-page/` | FAQPage example for a **proposed `/faqs` page**. This page is not part of the verified live inventory. Do not deploy the example until that page exists and displays the included questions/answers. |
| `live-evidence.json` | Parsed server HTML evidence: existing JSON-LD, canonical URLs, visible page content, FAQs, links, fetch results and hashes. `rawFile` paths identify temporary crawl files and are not required to use the package. |
| `endpoint-evidence.json` | Public image, robots and domain-resolution checks. |
| `live-sitemap.xml`, `live-robots.txt` | Public discovery files observed during the audit. |
| `build-jsonld.py`, `validate.py`, `crawl.py` | Snapshot-based generation, local validation and repeatable public crawling. |
| `validation-results.json` | Local validation result and its limits. |

The graphs contain observed live contact details and article facts. There are no placeholder prices, made-up reviews, professional credentials, opening hours or legal company identifiers. The package does not deploy changes or establish Google rich-result eligibility by itself.

The existing local application was not modified. Project lint and TypeScript checking passed during the audit.
