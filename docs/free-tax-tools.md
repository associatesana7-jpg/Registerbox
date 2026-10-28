# Free public tax tools: scope, sources and maintenance

Review: **28 October 2026**. All seven tools use deterministic client code and bundled reference data. They have no tax API, API key, metered AI, payment or login dependency. They collect no uploaded documents. Browser print can save the invoice to PDF without a conversion service.

## Public routes and supported computations

| Route under `/tools/` | Supported result | Boundary |
| --- | --- | --- |
| `gst-calculator` | Add/remove a supplied GST rate; taxable value, CGST/SGST/UTGST or IGST | Arithmetic does not determine classification, legal place of supply, valuation or cess. Integer paise, half-up rounding, split balance reconciled in second local head. |
| `gst-invoice-generator` | Domestic forward-charge positive-rate taxable invoice, multiple rates, quantities and rupee line discounts, printable PDF | Standard supplier GSTIN and recipient/state facts required. Not a bill of supply, export/SEZ/RCM/cess invoice, IRN/QR generator or GSTN upload. Uniqueness, signatures and e-invoice applicability need the operator’s confirmation. |
| `hsn-sac-gst-rate-finder` | Search bundled official goods schedules and the explicitly identified service subset | Display every matching description/condition, effective date and source. Missing matches never imply exemption or 18%. See the dataset’s source ledger and generation script. |
| `income-tax-regime-calculator` | Individual ordinary slab income, old/new comparison for FY 2025–26 and Tax Year 2026–27, entered deductions, rebate/relief, surcharge/relief, cess, statutory rounding | No special-rate/dividend/agricultural integration/family-pension/loss/AMT/foreign-relief calculation. No deduction entitlement, regime election, return filing or automatic Form 16 extraction. |
| `tds-calculator` | Selected resident non-salary payments for 2025–26 and 2026–27, payer tests, thresholds, PAN cases, cumulative catch-up, whole-property base and rent | Salary, nonresident/treaty, certificates, exemptions and the other stated exceptions require review. Small individual/HUF payer’s covered 194M categories aggregate together. Section labels distinguish1961Act from 2025Act. |
| `gstin-validator` | Standard PAN-based format, state/jurisdiction code, PAN pattern and Luhn mod 36 checksum; up to 100 entries | Internally consistent does not mean registered/active. No legal name, status, certificate, PAN lookup or ITC determination. Special identifiers are not represented as ordinary valid GSTINs. |
| `gst-late-fee-calculator` | Normal GSTR-1/3B framework for supported periods from June 2021; confirmed due date, actual/planned filing date, nil category and previous-year turnover caps | No automatic extensions, waiver/amnesty eligibility, live liability, interest, other forms or older-period relief. Unknown concessions produce a review state rather than an asserted payable zero. |

## Where rules live

- GST arithmetic and validation: `src/lib/public-gst-tools.ts`; the source registry points to CBIC invoice/registration provisions and official taxpayer search.
- Income tax: `src/lib/income-tax-calculator.ts` exports versioned periods, sources, assumptions and exclusions. Enacted2026 law and official transition guidance were reviewed; do not reuse old section numbers for new-period filing instructions.
- TDS and late fee: `src/lib/tds-calculator.ts`, `src/lib/gst-late-fee-calculator.ts` export official source registries and review metadata.
- Rate search: `src/lib/gst-rate-data.ts`, `src/lib/gst-rate-finder.ts`, `scripts/generate-gst-rate-data.py` and `docs/gst-rate-sources/` preserve source provenance and extraction logic. Full conditional text takes precedence over a short label.
- Search content: `src/lib/tax-tool-content.ts` provides answer-first headings, worked examples, scope, four visible Q&As per tool and service destinations. `tax-tool-page.web.tsx` emits matching FAQ, application and breadcrumb structured data into static HTML.

## Privacy and security

Inputs live in component memory; no local/session storage, cookies, query-string serialization, uploads, dynamic HTML, evaluation or tax-service calls. The calculator workspace is masked for session replay. Displayed names and addresses are React text. Inputs have length, value and row limits. Before hydration controls are disabled, and there is no native GET form submission. Official source links carry no entered values. Tax tools have nosniff, restrictive referrer/permissions and object/form/frame CSP directives without broad changes to other routes.

This is a scoped design, not a claim that arbitrary future additions are safe. Keep file import, account integration and filing outside these tools unless reviewed separately. Never expose secrets or introduce API calls while advertising offline computation.

## Search discovery and measuring outcomes

Each route is public, prerendered and linked from the homepage, free-tools directory and peer tools, with a self-canonical and sitemap entry. Explanations, examples and FAQs remain readable without JavaScript. User-specific results are not fabricated for crawlers. Free-tool structured data has a zero-price offer; no invented reviews or government affiliation.

No schema, keyword or sitemap guarantees indexing, ranking or AI citations. After a release, use Search Console for the actual route’s indexed status, search queries, impressions and clicks. Evaluate AI answer references separately. Rewrite unclear content using real search-intent evidence; do not stuff keywords or add invisible Q&As.

## Validation and updates

Run `npm run test:tax-tools`, `npm run test:licences`, `npm run lint -- --no-cache`, `npx tsc --noEmit`, `npm run build:web`, `python3 scripts/check-public-seo.py`, `python3 scripts/check-business-licence-seo.py` and `python3 scripts/check-tax-tools-seo.py`.

Boundary tests cover inclusive GST reconciliation, line discounts/rounding, published GSTIN examples, slab/rebate/surcharge boundaries, age/residency, strict TDS thresholds/catch-up, date/leap-year behavior, fee caps and schedule integrity/lookup. Independent cross-review is used for the tax engines and invoice particulars. Re-run affected tests whenever a rule changes; an old successful test is not evidence that a later notification is implemented.

For an amendment: obtain the effective official text, record the old/new rule and dates, update the version and visible scope, add boundary/transition tests and rebuild static pages. Do not infer legal changes from a search snippet or infer no change merely because a site was unreachable. If facts or authority cannot be resolved, return a review state and explain the missing fact.
