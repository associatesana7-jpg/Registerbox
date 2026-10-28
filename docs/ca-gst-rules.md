# Offline CA GST tools — rules and scope

Rule version: `2026-10-28.1`. Source review: 28 October 2026. The date identifies a maintained rules snapshot, not a promise of live portal status. These tools neither call a tax API nor write to a government portal. The UI displays entered facts and calculation results separately from authoritative records.

## ITC set-off

Authority: CGST Act sections 49, 49A, 49B; rule 88A; [CBIC Circular 98/17/2019-GST](https://cbic-gst.gov.in/pdf/Circular-98-17-2019-GST.pdf), 23 April 2019. IGST first pays IGST. Remaining IGST pays CGST/SGST in any permitted order/proportion before local credit use. Local credits pay their own heads, then IGST in the required order. Local cross-use is prohibited.

The algorithm operates in integer paise. It applies surplus IGST first to local shortfalls that own-head credit cannot cover, then to other local liability. This is one cash-minimising legal allocation, not the only allowed allocation. Tests compare it with exhaustive small-balance allocation alternatives and check conservation under each head. Cash is before cash-ledger balances. Reverse-charge tax, cess, fees, interest and rule 86A/86B or other restrictions are excluded. Confirmed eligible ledger credit is required.

## E-invoice

Authority: rule 48(4); Notification 13/2020 as amended; [Notification 10/2023–Central Tax](https://gstcouncil.gov.in/node/4365), 10 May 2023, effective 1 August 2023. Statutory turnover boundary is **exceeding** ₹5 crore, not ≥₹5 crore. Aggregate turnover is PAN-wide in any preceding FY from 2017–18. Current-year crossing alone is not the preceding-year test. Coverage includes taxable B2B/export/SEZ documents and corresponding tax notes; exclusions include specified supplier classes and documents. Supplier SEZ units differ from developers and suppliers to SEZ.

[GSTN overview](https://www.gstn.org.in/assets/mainDashboard/Pdf/english-version-1.2-Dt-30-3-2021.pdf) supplies document/excluded-entity distinctions, not the superseded historical turnover threshold. [Authorised IRP advisory](https://einvoice6.gst.gov.in/content/revised-time-limit-for-e-invoice-reporting-for-businesses-with-aato-of-%E2%82%B910-crores-above/) records the 30-day restriction effective 1 April 2025 for AATO ≥₹10 crore. Document date is day one (1 April → 30 April). Applicability and reporting-window eligibility are distinct from required compliant invoice issuance. Supported document dates: 1 August 2023 through review date.

The previous [authorised IRP reporting advisory](https://einvoice6.gst.gov.in/content/revised-deadline-for-invoice-reporting-on-the-irp-portal/) applies the 30-day window from 1 November 2023 at AATO ≥₹100 crore. This historical threshold is also implemented; there is no retroactive ₹10 crore window before 1 April 2025.

## E-way bill validity

Authority: rule 138(10); [NIC portal FAQs](https://docs.ewaybillgst.gov.in/html/faq1.html), sections on validity and midnight examples. Ordinary movement uses 200 km/day or part from 1 January 2021. ODC / multimodal ship branch uses 20 km/day or part; the latter is documented in the [official rules compilation](https://cbic-gst.gov.in/pdf/01012020-CGST-Rules-2017-Part-A-Rules.pdf). Its old ordinary 100 km entry is superseded for this tool’s date range by the 200 km rule.

One validity day ends at midnight after the next calendar day: start 14 March at either 00:04 or 23:58 → last valid date 15 March, expiry 16 March 00:00 IST. Date arithmetic uses calendar days and explicit IST presentation; browser locale/DST cannot change expiry. Start is first relevant Part-B entry, not merely saving Part A. No distance is measured, no API map is used, no applicability/exemption/generation/extension claim is made. Supported start dates: 1 January 2021 through review date. Entered distance is whole km and bounded 1–4,000 in line with the [NIC generation schema maximum](https://docs.ewaybillgst.gov.in/apidocs/version1.03/generate-eway-bill.html). The tool does not validate PIN-to-PIN tolerance, same-PIN limits or portal acceptance.

## Place of supply

Authority: [IGST Act sections 7, 8, 10, 12](https://cbic-gst.gov.in/hindi/IGST-bill-e.html); [Circular 209/3/2024-GST](https://www.gstcouncil.gov.in/sites/default/files/2024-09/circular-no-209-03-2024.pdf), 26 June 2024. Supports domestic ordinary goods movement/no movement, third-person direction, installation, onboard goods; general domestic services only after excluding sections 12(3)–(14); single-State domestic property, restaurant/personal services, training, admission.

Section 10(1)(ca), effective 1 October 2023, overrides ordinary movement/no-movement branches for goods to unregistered persons. Use recipient address recorded in invoice; where different delivery and billing addresses are recorded, use delivery per Circular 209. A recorded State counts as an address. No recorded recipient address → supplier location. Bill-to/ship-to result is for the supplier-to-directing-third-person leg only. SEZ supplies are inter-State regardless of equal States. Rate, taxability, authorised operations, zero-rating and establishment location are not inferred. Cross-border/unlisted/multi-State branches return review. Supported dates: 1 October 2023 through review date.

## Reverse charge

Authority: section 9(3); [Notification 13/2017–Central Tax (Rate)](https://gstcouncil.gov.in/en/node/4434), entries 1, 2, 6 as amended; [Notification 05/2022–Central Tax (Rate)](https://cbic-gst.gov.in/pdf/central-tax-rate/05_2022-ctr-eng.pdf) GTA forward-charge proviso; [Circular 140/10/2020-GST](https://cbic-gst.gov.in/pdf/Circular-GIC-Approval-Director-Renumeration.pdf) employment/director services distinction. Legal exemptions under Notification 12/2017 entry 45 are visible in the [CBIC service exemption table](https://cbic-gst.gov.in/hindi/gst-goods-services-rates.html), Heading 9982/9991. The [West Bengal department’s amended service RCM table](https://comtax.wb.gov.in/GST/GST_PPU/RCM_Services%209%283%29_WBGST_20250320.pdf) corroborates party/recipient definitions and amendment history; Central authority remains the primary rule.

Supported domestic paths only: director services in director capacity outside employment; specified advocate legal services and entry 45 exemptions; taxable GTA with consignment note, no applicable freight exemption, no valid forward-charge exception, and a notified recipient liable for freight. Unknown facts return review. Legal business exemption is eligibility for the preceding-FY registration-exemption condition, not merely the presence/absence of a GSTIN. Senior advocates do not inherit the non-senior advocate-to-advocate exemption. GTA invoice tax alone is not a valid election/declaration. Government recipients registered only for TDS need the notified exemption review. The tool does not compute a tax rate, decide all RCM categories or turn ordinary unregistered purchases into universal RCM. Supported dates: 1 October 2023 through review date.

## QA and change control

`node --test scripts/test-ca-gst-tools.mjs` exercises strict amount validation, credit conservation and allocation minimum, turnover boundaries, IRP inclusive reporting dates, EWB distance/calendar boundaries, B2C invoice addresses, service special rules, SEZ treatment, director employment, legal exemptions and GTA evidence. Run repository lint and typecheck after integration. Recheck effective official notifications before widening dates/categories; store the new rule version and matching boundary tests. No GST passwords, GSTINs, OTPs, portal filing statuses or fabricated acknowledgements are collected.
