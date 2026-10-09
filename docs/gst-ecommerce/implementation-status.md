# Ecommerce filing implementation

Status: persistent imports, seller/operator GSTR-3B drafts, table 15/15A draft shapes and operator TCS workpapers implemented; comprehensive ecommerce filing is not released.

## Implemented in this increment

- Common invoice-level CSV preparation model with explicit amounts, source names, GSTINs, period, supply treatment, notes and amendment links.
- Seller/operator-specific reporting destinations for 14/14A, 15/15A, registered-recipient notes in 9B, and 3.1.1(i)/(ii).
- Operator section-52 records marked for GSTR-8 review, not operator turnover.
- Cross-import duplicate/conflict detection against persisted platform/POS imports, plus source-file checksum replay protection. Existing ordinary return invoices are not yet queried automatically.
- Strict parsing; ambiguous or invalid rows prevent committing that file to the preview.
- Review embedded in regular GST return preparation. Imported seller section 9(5) rows can populate a private GSTR-1 table 14(b) draft and GSTR-3B 3.1.1(ii) draft. Existing platform sections cannot be silently overwritten. Mixed section-52 and amendment reports are blocked from this builder.
- Synthetic scenario tests in scripts/test-gst-platform-import.mjs, scripts/test-gst-platform-workspace.mjs and scripts/test-gst-platform-handler.mjs. Handler tests cover owner isolation, consent, reload, replays and concurrent writes.
- Original CSV files, checksums, rule versions, timestamps, rejected-import issues and accepted rows persist in gst_platform_workspaces, scoped to user/business/GSTIN/period/role. Only the owner-checked backend can access this table.
- GSTR-3B eco_dtls is verified in provider save-v6.0 workbook. Optional fields are validated and reconciled. Portal ecommerce values cannot disappear from reconciliation, and nil review checks for ecommerce activity.
- Backend persistence and draft support deployed. GST_ECOMMERCE_WRITES_ENABLED remains a separate release gate; these ecommerce drafts cannot currently be submitted through the app.

- Operator section 9(5) imports can now populate private GSTR-3B 3.1.1(i) drafts across all four supplier/recipient registration combinations. Ordinary outward supplies and seller 3.1.1(ii) are not increased. Same-period registered-supplier notes require a matching original invoice; cumulative credits cannot exceed that invoice. Duplicate/conflicting documents, mixed section-52 reports, amendments and unsupported note links are rejected. Tests: scripts/test-gst-operator-draft.mjs. Backend draft support is deployed; the mobile UI changes have not been released or visually tested.

## Remaining work (do not advertise as supported filing)

1. Add reviewer resolution/replacement workflow for rejected source batches, source downloads and invoice/POS database matching. Current persisted batches are append-only through the app.
2. Obtain representative anonymized Swiggy/Zomato/POS reports, implement versioned column adapters, settlement reconciliation and invoice-versus-order matching. Current parser supports the displayed common CSV format only (500 KB per file, 5,000 accepted records per account/period/role, 50 source batches).
3. Complete SUPECOA and the remaining operator workflows; verify live read/write acceptance, authoritative amendment-original links, notes, multi-rate imports and duplicate-liability protection. ECOM/ECOMA shapes, seller SUPECO/paytx and 3B eco_dtls drafts now have validation and reconciliation. Table-15A values do not automatically alter 3B: original-versus-revised liability deltas remain pending.
4. Complete ordinary sales/notes/amendments/advances, applicable HSN B2B/B2C and document summaries. Integrate with existing purchase/2B/ITC review rather than assuming ITC from an invoice.
5. Add operator cash-only payment treatment and connect the GSTR-8 workpaper to a complete registered-operator return workflow only after confirming provider support. No GSTR-8 endpoint found in the current published Sandbox index.
6. Conduct provider sandbox acceptance and mobile UI tests covering full save/poll/reconcile/authorize/file/acknowledgement flow. Current tests are synthetic preparation scenarios, not live end-to-end filing certification.

## Documentation findings

- GSTN mapping advisory: https://tutorial.gst.gov.in/downloads/news/updated_advisory_new_table1415_cr23892_sj_10.01.2024.pdf
- Sandbox index: https://developer.sandbox.co.in/llms.txt
- GSTR-1 workbook: https://raw.githubusercontent.com/in-co-sandbox/in-co-sandbox-docs/refs/heads/main/data/gst/schema/workbook/taxpayer/gstr-1/file/save-v4.1.xlsx
- GSTR-3B save docs: https://developer.sandbox.co.in/api-reference/gst/compliance/endpoints/taxpayer/gstr-3b/save

Workbook SUPECO correctly describes clttx as section 52 and paytx as section 9(5), while SUPECOA subsection descriptions reverse those labels. This inconsistency must be resolved against authoritative schema/examples before implementing live amendment writes. The public GSTR-3B save example omits 3.1.1, but the linked save-v6.0.xlsx workbook confirms eco_dtls.eco_sup (value and taxes) and eco_dtls.eco_reg_sup (value only). This schema is now implemented for drafts; live acceptance is still unverified.

## Business rules not inferred

The platform's name is not sufficient to determine section 9(5). Users or preparers must establish actual supply classification, applicable period/rules and exemptions. The preview does not validate GST registration status, statutory amendment deadlines, rate eligibility, full books completeness, ITC entitlement or cash balances. It does not sum amendment replacement values into current turnover or silently turn net payouts into sales.

## 2026-10-09 increment

- GSTR-1 ECOM: B2B, URP2B invoice payloads; B2C, URP2C supplier/POS/supply-type/rate summaries. Imported documents require explicit rate and supplyType; registered-recipient invoices also require invoiceType R. No tax rate or supply type is inferred from net payouts.
- ECOMA: B2BA/URP2BA invoice replacements with exact original number/date; B2CA/URP2CA whole-summary replacement validation through the existing advanced JSON editor. Consumer invoice amendments cannot be summed into a replacement summary automatically. Notes, SEZ/deemed exports and authoritative original-record retrieval remain pending.
- Both sections join full-content portal reconciliation and the existing ecommerce write release gate. The gate now explicitly covers ECOM/ECOMA/SUPECOA as well as SUPECO and eco_dtls. Actual handler tests prove it blocks save, proceed, offset, OTP and file.
- Common CSV remains backwards compatible; optional rate, supplyType, invoiceType, originalDate and separate tcsIgst/tcsCgst/tcsSgst columns persist with source records under rule version gst-eco-2024-01-v2.
- GSTR-8 source workpaper groups section-52 supplies, returns, net value and explicit source TCS by supplier/POS. Invoice GST is never copied into TCS. Missing amounts stay visibly incomplete. This does not compute statutory TCS, validate TCS registration, or produce a provider GSTR-8 payload.
- Deployed and read-back verified: gst-returns v21, gst-platform-workspace v2. JWT verification preserved; no migrations or environment flags changed. Mobile app updates remain local.
- Added scripts/test-gst-ecom.mjs and scripts/test-gst-tcs-review.mjs; expanded real-handler release-gate tests. No actual taxpayer return was sent.
- Native report fixtures were not found in the project. Native platform adapters remain blocked on anonymized source exports. Provider test documentation describes static example mocks; those are not GSTN acceptance evidence. See provider-acceptance.md for the scenario matrix and precise provider questions.

## AI and amendment archive increment

- Original filed-archive linkage and reviewable amount deltas are implemented for table 15A; evidence is stored separately from the provider payload. Complete GST amendment history is still unverified and explicitly blocks live writes.
- AI uses a shared versioned capability/workflow catalogue and routes to the same imports, purchase review and filing screens. Selected-business isolation and redaction are enforced server-side. See ai-workflows.md.
- gst-returns v22 and registerbox-ai v11 are deployed and source read-back verified. Amendment evidence migration is applied. Ecommerce write gates remain unchanged.
- User confirmed Sandbox only, with no GSTR-8 contract. GSTR-8 live integration and provider acceptance cannot be completed from available contracts. Native export fixtures are still absent.
