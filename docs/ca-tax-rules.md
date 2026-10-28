# Offline CA tax/accounting worksheets

Rule review: 28 October 2026. No network or external API is used by the calculation modules. Six calculators are deliberately scoped; their public answers, examples, FAQs, sources and limitations are exported in `src/lib/ca-tax-content.ts` for static rendering by the parent page.

## Presumptive income

FY 2025-26: 1961 Act sections 44AD/44ADA; tax year 2026-27: corresponding 2025 Act section 58(2) categories. Official sources: section 44AD, ITR-4 FAQs and the consolidated 2025 Act linked in metadata.

- Eligible resident individual/HUF/non-LLP firm for 44AD; resident individual/non-LLP firm for 44ADA.
- ₹2 crore / ₹50 lakh ordinary limits; ₹3 crore / ₹75 lakh when cash received during year does not exceed 5%. Exactly 5% qualifies. Non-account-payee cheques/drafts count as cash.
- 44AD qualifying receipts within prescribed modes/timing use 6%; remaining turnover 8%. 44ADA uses 50%. Higher profit entered is retained; lower profit routes to review.
- Excluded activities, prohibited deductions and 44AD five-year restriction are confirmed by the preparer. No final slab tax, audit determination or ITR-4 eligibility is fabricated.

## Advance tax and interest

Supports FY 2025-26 (234B/234C) and tax year 2026-27 (424/425). Inputs distinguish returned-income tax for deferment from assessed tax for default interest. Each input is net of eligible reductions but includes surcharge/cess.

- Ordinary cumulative targets 15/45/75/100% on 15 June/September/December/March.
- Single 15 March target only for 44AD/44ADA equivalents (new Act section 58(2) Table rows 1 and 3), expressly excluding 44AE.
- ₹10,000 net-tax threshold; verified resident 60+ with no business/profession exemption.
- Deferment: 3% on first three target shortfalls and 1% on March shortfall. June/September have inclusive 12/36% tolerance; target remains 15/45%.
- Default: paid advance tax below 90% of assessed tax; monthly 1% from following 1 April through calculation/settlement month. Interest tax bases truncate to ₹100. Each payment month is charged once on its opening shortfall; amounts appropriated to tax reduce subsequent month's opening shortfall. Multiple payments in one month do not duplicate that month's charge.
- Post-March payments must be the income-tax component after interest/fee appropriation. Unpredictable-income exceptions, due-date holiday/notification shifts, 234A, prior interest paid and assessment adjustments are excluded and explicitly reviewed before normal calculation.

## Depreciation

Continuing ordinary income-tax WDV blocks without disposals/cessation/other adjustments. Classes: residential 5%, ordinary building/furniture 10%, plant/car 15%, eligible intangible (no goodwill) 25%, computer/software 40%. Official Appendix I and section 32 / corresponding new Act apply.

Additions are acquired within year. Put-to-use day is included: <180 days half rate; ≥180 full; after year-end zero. Opening assets assumed eligible and used. Costs supplied already reflect ITC/tax-law adjustments. Additional depreciation, special rate windows, Companies Act useful lives and capital-gains block treatment excluded.

## MCA normal fee

G.S.R. 435(E), 7 May 2018, verified from official IndiaCode PDF. Supports post-30 June 2018 due dates only: AOC-4 family and MGT-7/7A ₹100/day; ADT-1 first 15 delayed days 1× normal fee; selected MGT-14/remaining ADT-1 bands 2/4/6/10/12× at 30/60/90/180/>180 days. Fee includes actual filing day and excludes due day. Normal fee is entered from the official form preview.

MCA relief is time-sensitive. No unverified extension or facilitation scheme is hardcoded. The normal fee remains visible, but actual total is withheld until the preparer confirms the official relief/portal check. A fee-waiver window cannot silently replace a statutory due date. LLP, charge/capital forms, repeat-default special forms and penalties excluded. Date coverage through 31 March 2027 is an implementation bound, not a statement that all relief has been reviewed through that date.

## Karnataka employee PT

FY 2025-26/2026-27: monthly salary/wages ≥₹25,000: ₹200 except February ₹300; below threshold zero. A verified full-year exemption yields zero. Actual monthly figures avoid annual-average errors. Official Act 33/2025 Gazette, CTD FAQs, notification index and 2023 exemption notification linked. The 2026 amendment concerns enrolled-person returns, not a salary-rate change. Enrolment/business dues, mixed-year exemption and employer interest/penalties excluded.

## Draft P&L and balance sheet

Adjusted unclosed trial balance only, ≤250 rows; exactly equal debit/credit totals to paise. Accounts classified as asset/liability/equity/income/expense/drawings, retaining contra signs. Profit = income − expenses. Closing equity = opening equity + profit − drawings. No balancing capital or suspense plug. Requires confirmation current-year profit has not already been closed into equity. Draft management summaries only; no statutory format/disclosure claim. CSV formula-looking user labels are escaped; TSV values are parsed as data and never evaluated.

## Verification

`node --test scripts/test-ca-tax-tools.mjs` covers parser rejection, statutory boundaries, cash threshold, excluded entities, target tolerance, exact 90%, March 31 distinction, monthly interest, 180 days, form fee bands, salary threshold/February and trial-balance contra/imbalance handling. Run project lint/typecheck and parent static-page checks before publishing.
