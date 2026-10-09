# GST return workflow — release status

## Implemented

- Guided single-rate B2B invoice entry with CGST/SGST or IGST preview; JSON is behind advanced accountant tools.
- Separate nil declarations for GSTR-1 and GSTR-3B, persisted in the versioned private payload. Provider requests use the documented `isnil` / `isNil` flags, never the private declaration object.
- Nil contradiction checks reject nonzero fetched records and missing evidence. These do not independently verify GSTR-2B or previous nil filings; those are explicit taxpayer declarations. Live writes remain locked.
- Unsaved editor changes disable provider actions until saved and re-approved.

Still pending: guided creation of regular GSTR-3B, B2C/mixed-rate/HSN completeness, friendly liability allocation and cash-shortfall/challan flow. Do not describe this preview as a complete end-to-end filing product.

- GST login OTP linking and server-only encrypted taxpayer session.
- Private, versioned JSON drafts with server validation; editing replaces approval fingerprints.
- GSTR-1: ordinary domestic, non-reverse-charge B2B invoices only. Other top-level sections fail explicitly. Import up to 500 invoices / 900 KB.
- GSTR-3B: preparation JSON import; payment data must come from the post-offset GST response.
- Aggregate B2B comparison, or GSTR-3B prepared-field comparison, against fresh portal records.
- Separate consent for portal save, processing status, proceed, ledger read, allocation preview, offset, EVC and filing.
- Server-side snapshot fingerprint recheck immediately before EVC and filing.
- Operation audit records, connection-level lock, no automatic write retries, unknown-result state, provider acknowledgement required for filed state.

## Not yet production-qualified

`GST_RETURN_WRITES_ENABLED` is intentionally unset/false. Read-only reconciliation and private drafts work without it. Do not enable it merely to clear the UI warning.

Before enabling live writes, complete provider test-environment acceptance for both forms: save/reference status, validation rejection, proceed, ledger insufficiency, offset, EVC rejection/expiry, successful file acknowledgement and timeouts at every write. Provider paths and envelopes must be verified against those responses, not only documentation.

The app does **not** provide full GSTR-2B invoice matching, automated ITC eligibility, all GSTR-1 sections, QRMP-specific preparation, HSN completeness checking, accountant certification or banking/challan payment. Missing data must never be inferred as a nil return. Ledger allocations are supplied and approved by the taxpayer/accountant, not calculated by AI.

The current GSTR-3B comparison is prepared-data-to-portal, not books-to-GSTR-1-to-GSTR-2B reconciliation. User declarations are separate and do not upgrade the comparison to a verified tax conclusion.

## Recovery

- An `unknown` outcome blocks repeats and draft edits. Check GST and reconcile with the provider using the operation timestamp/reference before an operator resolves it. There is intentionally no client reset shortcut.
- A confirmed processing rejection is `blocked`; correct the draft as a new revision.
- A changed portal snapshot invalidates the review and OTP authorization.
- No OTP is stored, returned, or logged. Never log provider URLs because filing APIs use OTP query parameters.
- Rotating the Sandbox secret invalidates sessions if `GST_TOKEN_ENCRYPTION_KEY` is not configured separately. Users reconnect with a login OTP.

## Verification commands

`node scripts/test-gst-returns.mjs`

`node scripts/test-gst-review.mjs`

`npx tsc --noEmit`

`npx expo lint`

No real taxpayer return may be filed as a development smoke test.
