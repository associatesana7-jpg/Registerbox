# Ecommerce provider acceptance record

As of 2026-10-09: local synthetic tests pass; provider/GSTN acceptance is **not established**. No real return was saved, offset, authorized or filed during development.

## Evidence levels

1. Local schema/domain tests: four table-15 categories, table-15A invoice and summary shapes, exact content comparison, malformed inputs, period boundaries, duplicate documents, missing source data and mutation release gates.
2. Provider mock tests: not run for these additions. Sandbox documents that its test host returns saved example responses for matching requests. Such responses confirm interface behavior, not acceptance of arbitrary ecommerce figures.
3. Authorized provider/GSTN acceptance: pending a designated acceptance taxpayer/period and provider test procedure. Record request IDs, exact sanitized request/response hashes, polling outcomes and full read-back. Never use a customer's real return as a smoke test.

## Scenarios required before release

| Scenario | Local | Provider mock | GSTN acceptance |
|---|---|---|---|
| ECOM B2B / URP2B ordinary invoices | Pass | Pending | Pending |
| ECOM B2C / URP2C summaries | Pass | Pending | Pending |
| ECOMA B2BA / URP2BA shape validation | Pass | Pending | Pending |
| ECOMA B2CA / URP2CA replacement summaries | Pass | Pending | Pending |
| Supplier SUPECO paytx | Pass | Pending | Pending |
| Supplier SUPECOA labels | Unresolved documentation conflict | Pending | Pending |
| Operator 3B eco_sup and seller eco_reg_sup | Pass | Pending | Pending |
| Operator cash-only payment and ledger transaction code | Not implemented | Pending | Pending |
| HSN coverage, note routing, original amendment retrieval | Incomplete | Pending | Pending |
| GSTR-8 save/read/offset/authorize/file/status | No published provider contract found | Pending | Pending |

The existing ecommerce write flag remains off. No code in this increment changes environment flags. A mock success must not enable it.

## Provider questions to resolve

- Supply current ECOM/ECOMA write examples and exact read-back envelopes, including regular invoice type R for B2B (present in read schema, omitted from write workbook enumeration).
- Confirm SUPECOA clttxa/paytxa section mapping; its workbook descriptions reverse section-52 and section-9(5) labels.
- Confirm amended original invoice/summary retrieval, replacement versus deletion behavior, financial-year limits and changed supplier/recipient handling.
- Supply operator 3B cash-only liability transaction code and set-off examples.
- Confirm whether this account has GSTR-8 capability and provide versioned contracts for registration/authentication, all sections, amendments, payment, filing and acknowledgements.
- Supply a designated acceptance environment and fixtures that validate real payload content, beyond static mocks.

## Sources

- https://developer.sandbox.co.in/guides/developer-resources/test_environment
- https://developer.sandbox.co.in/guides/developer-resources/environments
- https://developer.sandbox.co.in/api-reference/gst/compliance/endpoints/taxpayer/gstr-1/documents/ecom
- https://developer.sandbox.co.in/llms.txt
- https://tutorial.gst.gov.in/downloads/news/updated_advisory_new_table1415_cr23892_sj_10.01.2024.pdf

## Native report adapter inputs

No native Swiggy/Zomato export fixtures are present in this repository. Before declaring an adapter supported, obtain anonymized original exports preserving headers, layout, report/version labels, dates and monetary relationships: ordinary order, cancellation/refund, credit/debit note, multiple GST rates, and a settlement crossing month-end. Mask names/contact/address/PAN and substitute structurally valid GSTINs. Never map bank payout, commission, TDS or TCS columns into invoice GST. Preserve the source file, normalized rows, adapter version and rejected rows; compare against POS invoices without double counting.

The common CSV importer is functional; it must not be advertised as a native platform adapter.
