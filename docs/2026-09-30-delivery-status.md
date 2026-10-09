# RegisterBox delivery status — 30 September 2026

## Implemented and checked

- PIN-first application address with real postal-directory lookup, state/district suggestions, scrollable locality/state selectors and manual fallback. No street or city is fabricated. Only PIN is sent to the public provider; all suggestions require user confirmation.
- Address is retained in the category draft and saved to the reusable business address when complete. User-entered suggestions cannot overwrite a verified GST address.
- New applications start separate business drafts unless resuming an existing category draft. GST return filing remains linked to the selected GST profile.
- Scrollable counts/choices, conditional questions, per-director/partner identity/address upload slots, category-specific intake, separate GST-registration action, editable review and explicit missing-document counts.
- Fixed safe-area placement so scrolling cannot move the title into the iPhone status bar.
- Saved purchase books, CSV import, complete-download GSTR-2B matching and mismatch/duplicate/manual-review results. Up to 5,000 book documents and eight GST download files; unsupported 2B sections are explicitly reported.
- Added guided GSTR-1 B2CS, registered credit/debit notes, exports, nil/exempt supplies and issued-document sections. Server validates payloads and compares fetched section content. Unsupported fields fail closed. Nil-return checks ignore ledger identifiers, not amounts.
- Supabase purchase migration applied; gst-workspace v3 and gst-returns v8 deployed. Public/anon/authenticated direct access to purchase tables denied; Edge validates authenticated owner.
- Dedicated monthly nil journey: selected period, connection continuation, eligibility, GST contradiction check, GSTR-1 preparation/status where needed, fresh review, signatory OTP and acknowledgement. No invoice/payment tabs or arbitrary phase hopping in this path. Saved drafts resume; regular drafts are not overwritten. GSTR-3B writes require live GSTR-1 filed evidence; nil status itself still needs declaration and data review. Preparation invalidates the old snapshot and forces a fresh comparison.
- Local browser verified the connection handoff and open September period message (opens 1 October), with desktop and 390px layout inspection. Nil transition tests passed. No live OTP or filing was performed.
- Automatic selected-period portal filing history for GSTR-1 and GSTR-3B, with ARN/date when returned. Server rechecks before drafts and every GST write, blocks filed and ambiguous statuses, and fails closed on unavailable history. Returns filed outside RegisterBox are covered by the provider check, not only local drafts.
- History parser tests cover other periods, successful empty responses, malformed/error responses, pending status and filed records with valid=N. Browser verified the deployed unavailable-status path: current GST connection needs reconnecting; no actual filed-history success has yet been observed on a fresh session.
- Typecheck, lint, static web export and deterministic purchase/GSTR-1/GSTR-3B/payment/period/intake tests passed. PIN 560001 visibly populated Karnataka/Bangalore and locality options in the local preview; test address was not saved.

## Not complete / not certified

- GSTR-1: B2CL, amendments, HSN entry, advances/adjustments and e-commerce scenarios remain outside guided coverage. B2B comparison remains aggregate, not invoice-level. Do not market this as complete GSTR-1 coverage.
- Live filing acceptance has not been performed. Synthetic validation success is not GSTN acceptance. Requires an authorized taxpayer, a closed return period, reviewed books, provider success/error evidence and signatory-controlled OTP. No development smoke test may submit a real tax return.
- GST 2B matches are not proof of ITC eligibility. ISD/import and other unsupported sections require separate review. Nil eligibility still includes taxpayer declarations.
- MCA, LLP, FoSCoS, GST registration and state/local permits are preparation drafts, not connected government submission workflows. Subscriber/share schedules, jurisdiction-specific forms, professional certification, digital signing and final portal checklists remain necessary. Category notices describe limitations.
- Native-device end-to-end upload and all responsive layouts still need acceptance testing; no claim that the whole app works perfectly.

## Sources used

- https://developer.sandbox.co.in/llms.txt
- https://developer.sandbox.co.in/api-reference/gst/compliance/endpoints/taxpayer/common/track_returns.md
- https://raw.githubusercontent.com/in-co-sandbox/in-co-sandbox-docs/refs/heads/main/data/gst/schema/workbook/taxpayer/gstr-1/file/save-v4.1.xlsx
- https://www.mca.gov.in/content/dam/mca/pdf/SPICEplus-and-linked-filings-FAQs-V3-20230122.pdf
- https://www.mca.gov.in/content/dam/mca-aem-forms/instructionkits/Instruction%20Kit_Form%20FiLLiP.pdf
- https://foscos.fssai.gov.in/apply-for-lic-and-reg
- https://tutorial.gst.gov.in/userguide/registration/Apply_for_Registration_Normal_Taxpayer.htm
- https://registration.shramsuvidha.gov.in/Users/stateintegration_acts/karnataka
- https://api.postalpincode.in/pincode/560001 (third-party postal directory, not government verification)

MCA direct downloads returned access restrictions; searchable official guidance was used for intake, not claimed as exhaustive form validation. State-specific retail requirements are deliberately not generalized nationwide.
