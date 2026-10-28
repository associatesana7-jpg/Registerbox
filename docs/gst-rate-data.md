# Offline HSN/SAC and GST rate finder

The finder is a deterministic, bundled schedule search. There is no runtime rate API, API key, paid data provider or language model. The lookup index lives only in the HSN/SAC page bundle. Inputs are processed in memory, not uploaded or placed into a URL.

## Coverage and effective-date policy

Snapshot reviewed on **28 October 2026**, version `2026-10-28.1`, for the current classification structure from **1 May 2026**. It does not calculate historical supply-date rates.

- **1,196 taxable goods entries:** all six currently surviving schedules in Notification 9/2025–Integrated Tax (Rate), including its 18 September 2025 corrigendum, the February 2026 tobacco changes and May 2026 beverage tariff changes.
- **172 exempt goods entries:** the entire schedule to Notification 10/2025–Central Tax (Rate). The 37 named drugs/medicines and 134 indigenous handmade musical instruments in its two annexures are included in searchable descriptions, with the original conditions retained.
- **8 special brick entries:** four standard 12% entries and their conditional 6% no-ITC concessions. Sand lime bricks remain a separate 5% goods entry. The concession is 6% total GST, not 3% total or 5%.
- **35 supported service entries:** legal/accounting, research, print advertising, professional/technical/IT services, qualifying e-books, telecom, tour/support, hotel/restaurant, postal/courier/local delivery, specified rail/multimodal transport, goods-carriage renting, job work/tailoring, beauty/cleaning and specified individual life/health insurance/reinsurance. This is an enumerated service subset, not an exhaustive service-exemption database.
- **941 official DGFT tariff heading labels** are bundled for item-name search, including headings whose GST description says only “All goods”. Only heading descriptions are imported from this source. Its RoDTEP percentages/caps are never used as GST rates. Labels are search aids; the current CBIC GST entry and its conditions control the result.

The goods-schedule row count is **not** an assertion that every Customs Tariff code or every possible transaction is covered. Specific concessions outside the bundled schedules, reverse charge, export/SEZ zero-rating, place/time of supply, compensation cess, central excise, HSNS cess and special valuations remain separate checks. A missing match never defaults to 18%, exempt or invalid.

For baseline service entries whose current wording results from amendments over time, the UI displays the snapshot review date rather than mislabelling1July2017 (the original notification’s date) as the effective date of a later-amended entry. Entries directly created/substituted by the verified2025 amendments show their operative22September2025 date.

A code can match several conditional rows. Rice under 1006, for example, returns the 5% pre-packaged-and-labelled entry and the exempt “other than pre-packaged and labelled” entry. Exempt chena/paneer and taxable other cheese under 0406 are shown separately. No automatic classification decision is made from an item name.

## Binding rate sources

1. [Notification 9/2025–Central Tax (Rate)](https://taxinformation.cbic.gov.in/view-pdf/1010436/ENG/Notifications), superseding 1/2017 from 22 September 2025. Extraction uses the matching [CBIC-hosted corrected 9/2025–Integrated Tax (Rate) schedule](https://courier.cbic.gov.in/ECCS/advisory/2025/NOTIFICATION%20NO.%209_2025-INTEGRATED%20TAX%20(RATE)%20-1759486719.pdf), which states total GST directly and includes the 18 September corrigendum. Original counts: I516, II640, III13, IV15, V3, VI2, VII6.
2. [Notification 10/2025–Central Tax (Rate)](https://taxinformation.cbic.gov.in/view-pdf/1010437/ENG/Notifications), effective 22 September 2025: exemptions and annexures.
3. [Notification 19/2025–Central Tax (Rate)](https://taxinformation.cbic.gov.in/view-pdf/1010534/ENG/Notifications), effective 1 February 2026: inserts II4A (biris, total18%) and III14–19 (specified pan masala/tobacco, total40%), and omits ScheduleVII. RSP-based valuation and separate non-GST levies are disclosed, not calculated by the finder.
4. [Notification 01/2026–Central Tax (Rate), updated with corrigendum6May2026](https://taxinformation.cbic.gov.in/view-pdf/1010645/ENG/Notifications), effective1May2026: I150 `22029921,22029929`; I151 `22029931,22029939`; III2 `22029100,22029991,22029999`; III3 `22029991,22029999`.
5. [Notification 14/2025–Central Tax (Rate)](https://taxinformation.cbic.gov.in/view-pdf/1010441/ENG/Notifications) and [02/2022–Central Tax (Rate)](https://taxinformation.cbic.gov.in/view-pdf/1009260/ENG/Notifications): standard bricks versus conditional no-ITC concession. Also cross-checked with [Ministry of Finance FAQ, question3](https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2167151&lang=2&reg=48).
6. [11/2017–Central Tax (Rate)](https://taxinformation.cbic.gov.in/view-pdf/1000997/ENG/Notifications) and [15/2025–Central Tax (Rate)](https://taxinformation.cbic.gov.in/view-pdf/1010453/ENG/Notifications): supported taxable service entries, including exact ₹7,500 hotel boundary and ITC options/constraints.
7. [12/2017–Central Tax (Rate)](https://taxinformation.cbic.gov.in/view-pdf/1000996/ENG/Notifications) and [16/2025–Central Tax (Rate)](https://taxinformation.cbic.gov.in/view-pdf/1010454/ENG/Notifications): supported service exemptions, including individual-versus-group insurance conditions.
8. [DGFT Appendix4RE](https://content.dgft.gov.in/Website/Appendix%204RE%20RoDTEP.pdf): heading descriptions only, never its rates.

The public CBIC CentralTax(Rate) catalogue was read directly during authoring. It listed213 notifications, including01/2026 with its6Maycorrigendum and19/2025. No later CentralTax(Rate) amendment was listed in that catalogue at review time. A recommendation/press report is not treated as a binding rate amendment. The site does not claim to monitor the catalogue live.

## Reproduce the dataset

`scripts/generate-gst-rate-data.py` is an authoring tool; it is not in the browser or production build pipeline. It needs Python and `pypdf` in the author's environment. No new application dependency is required.

Place these files in a temporary folder:

- `gst-rates-9-2025-igst.pdf`: the CBIC-hosted corrected IGST PDF linked above.
- `gst-1010437.pdf`, `gst-1010534.pdf`, `gst-1010645.pdf`: official CBIC exemption/amendment PDFs.
- `gst-hsn-heading-labels.pdf`: DGFT Appendix4RE linked above.

CBIC's `/view-pdf/…` pages are Angular viewers rather than raw PDFs. Its publicly used download endpoint is `https://taxinformation.cbic.gov.in/api/cbic-notification-msts/download/ID/ENG`, returning JSON with base64 `data`. This endpoint is used only by the author to save the official PDF; the website does not call it. Validate that decoded bytes begin `%PDF-` before extraction. Source SHA256 values for this release are recorded in `docs/gst-rate-sources/manifest.json`.

Run:

```sh
python3 scripts/generate-gst-rate-data.py --pdf-dir /absolute/path/to/temporary/downloads
node --test scripts/test-gst-rate-finder.mjs
```

The generator checks contiguous source serials for every original schedule and all172 exemptions, strips repeated headers/footers/corrigendum footnotes, preserves cross-page descriptions, reads the exemption table by physical PDF columns, and verifies both annexure counts. It applies the two explicitly documented amendment patches. A failed row-count assertion requires inspection, not loosening the assertion.

Lookup tests verify count/source integrity, complete serial sets, leading zeroes, Hindi/Kannada digits, parent-heading matches, **inclusive tariff ranges including interior headings** (e.g.5005 within5004–5006), exclusions, conditional rice/paneer, May2026 beverage codes, tobacco/biris, decimal GST splits, service ITC options and unknown-result behaviour. Unsafe HTML-like queries are treated as ordinary text.

Before a future release, inspect new binding notifications and corrigenda, update effective dates and source registry, add boundary/regression cases for changed entries, regenerate, and run lint/typecheck plus tests. The review date must represent a completed official-source review; it must never be advanced just to make data appear fresh.
