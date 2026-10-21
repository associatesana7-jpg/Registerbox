# Portal offset recovery · 16 October 2026

Production evidence showed definitive GSTR-3B nil filing rejection `RT-3BAS1079`: outstanding liabilities or saved GSTR-3B values. GSTR-1 for the same period had filed successfully. The nil page excluded payment actions and only offered generic status refresh, leaving the locally blocked attempt without recovery after external offset.

## Corrected flow

1. The rejected nil page offers **Load saved return & payment status**, with explicit consent.
2. `resume_portal` checks current ownership, revision, consent, session, closed period and authoritative filing history. Filed returns stay filed; pending or unknown operations cannot be overwritten.
3. Fetch complete GSTR-3B through the provider GET details endpoint. Preserve the previous private draft and error in source evidence. Copy actual figures without zero-filling or deleting disclosures; retain the original payment tables in the snapshot.
4. Increment private revision, clear the obsolete OTP/PAN and local rejection, and continue as the full saved return. This step neither offsets funds nor requests OTP nor files anything.
5. Explicit zero payable in `tx_pmt.tx_py` plus authoritative posting evidence permits prepared state. Zero alone can still need “Post credit to ledger.” Positive payable continues at payment; missing/incomplete rows remain unconfirmed. Historical `net_tax_pay` is not reused when current `tx_py` exists; prior payment amounts must never be allocated twice.
6. Keep reviewed allocation consent before offset, and carry `nettaxpay` with `pdcash`/`pditc` as documented by the provider. Refreshing an already-settled return must not repeat offset.
7. Review actual figures, approve the fresh snapshot, request a fresh EVC and file the complete provider return. The minimal `isNil: Y` payload is no longer used for this resumed return. Require provider acknowledgement for success.

## Sources checked

- [GST GSTR-3B user guide](https://tutorial.gst.gov.in/userguide/returns/GSTR3B.htm): nil eligibility, saved values and outstanding interest/late fee; distinction between zero and nil filing.
- [Sandbox GSTR-3B recipe](https://developer.sandbox.co.in/recipes/gst/gstr-3b/file_gstr_3b): fetch updated details after offset and send the full return including `tx_pmt` for filing.
- [Sandbox GET details](https://developer.sandbox.co.in/api-reference/gst/compliance/endpoints/taxpayer/gstr-3b/gstr_3b_details): current payable, paid cash and paid ITC tables.
- [Sandbox offset request](https://developer.sandbox.co.in/api-reference/gst/compliance/endpoints/taxpayer/gstr-3b/offset_liability): allocation fields and synchronous success response.

## Verification

Production handler tested against synthetic provider/database doubles: paid and unpaid recovery, preserved declaration/revision, old OTP invalidation, full filing payload, no repeat offset, already-filed conflict, pending/unknown protection, missing data, explicit consent, and existing nil/regular journeys. Shared mobile/web screen tested for consent, recovered-state routing and human review. These tests do not substitute for filing acceptance on a live taxpayer account.

## 20 October recovery update (not a live acceptance record)

- Synchronous offset acceptance is preserved before fetching the updated snapshot. Until current zero payable and posting are confirmed, keep `offset_pending` rather than reopening another offset. The accepted no-reference operation can be checked read-only. Timeout recovery uses the original pending-operation evidence and never repeats the write.
- Regular and nil IMS rejection recovery verifies matching GSTR-2B. Regular private figures remain untouched; changed GST data requires comparison/review, not silent import.
- Shared recovery cards map known errors to IMS, saved-return review, payment, reconnection, OTP or status checking. Reconnect carries a validated business/form/period/mode, not an arbitrary return URL. Fresh snapshot changes invalidate financial and filing approvals.
- Bank funding is not implemented by the documented Sandbox GST API. The cash-shortfall screen honestly opens the official GST payment page, then refreshes ledger balances on return or explicit checking. Closing the page is not proof of credit or payment. A supported challan/bank integration is still required for end-to-end cash funding without GST portal use.
- No taxpayer payment, offset, IMS mutation or return filing was performed during this verification. Current credit limits use provider-reported ledger amounts; current-return ITC is not blindly added, since the public schema does not establish whether it is already included.
