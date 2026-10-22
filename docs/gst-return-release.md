# GST return workflow — release status

## Implemented

- Guided single-rate B2B invoice entry with CGST/SGST or IGST preview; JSON is behind advanced accountant tools.
- Separate nil declarations for GSTR-1 and GSTR-3B, persisted in the versioned private payload. Provider requests use the documented `isnil` / `isNil` flags, never the private declaration object.
- Nil contradiction checks reject nonzero fetched records and missing evidence. These do not independently verify GSTR-2B or previous nil filings; those are explicit taxpayer declarations. Live writes remain locked.
- Unsaved editor changes disable provider actions until saved and re-approved.

Standard monthly GSTR-3B manual entry, explicit blank-to-zero confirmation, net-ITC calculation, reviewed credit/cash allocation and a tax-head-wise cash-shortfall display are implemented. Challan creation/payment is handed off to the official GST portal; refreshed balances and a new allocation approval are required on return. No in-app banking payment is claimed. Special restrictions and negative-liability adjustments require review. Do not describe this preview as a universally complete end-to-end filing product.

- GST login OTP linking and server-only encrypted taxpayer session.
- Private, versioned JSON drafts with server validation; editing replaces approval fingerprints.
- GSTR-1: ordinary domestic, non-reverse-charge B2B invoices plus the explicitly validated additional sections in `gstr1-sections.ts`. Unsupported sections fail explicitly. Import up to 500 B2B invoices / 900 KB.
- GSTR-3B: manual table-wise preparation or accountant JSON import; payment data must come from the post-offset GST response, not an imported payment claim.
- Aggregate B2B comparison, or GSTR-3B prepared-field comparison, against fresh portal records.
- Separate consent for portal save, processing status, proceed, ledger read, allocation preview, offset, EVC and filing.
- Server-side snapshot fingerprint recheck immediately before EVC and filing.
- Operation audit records, connection-level lock, no automatic write retries, unknown-result state, provider acknowledgement required for filed state.

## Not yet production-qualified

Release policy: `GST_RETURN_WRITES_ENABLED` must remain unset/false until acceptance is complete. Read-only reconciliation and private drafts work without it. Do not enable it merely to clear the UI warning. The deployed handler enforces this flag; its current value could not be independently inspected on 14 October 2026 because secret-list access was denied.

Before enabling live writes, complete provider test-environment acceptance for both forms: save/reference status, validation rejection, proceed, ledger insufficiency, offset, EVC rejection/expiry, successful file acknowledgement and timeouts at every write. Provider paths and envelopes must be verified against those responses, not only documentation.

The separate ITC/2B workspace provides purchase-book matching for its supported source categories. It is **not** comprehensive ITC eligibility certification or automatic reconciliation of every GSTR-3B entry. The app does **not** provide automated ITC eligibility, all GSTR-1 sections, QRMP-specific preparation, HSN completeness checking, accountant certification or banking/challan payment. Missing data must never be inferred as a nil return. Ledger allocations are supplied and approved by the taxpayer/accountant, not calculated by AI.

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

`node scripts/test-gst-3b-handler.mjs`

`npx tsc --noEmit`

`npx expo lint`

No real taxpayer return may be filed as a development smoke test.

## Verification on 14 October 2026

The regular GSTR-3B test executes the real Edge Function against an in-memory database and synthetic provider responses. It covers private draft, save, processing, comparison, ledger read, allocation approval, cash-shortfall rejection, changed-ledger rejection, offset, fresh comparison, EVC, acknowledgement, duplicate prevention, ownership, concurrent operation locks, release lock, stale consent, missing GSTR-1, invalid/stale snapshots, OTP expiry/rejection, missing acknowledgement and timeout/no-repeat behavior. Mock success is not provider or GSTN acceptance.

Sources checked: [provider GSTR-3B recipe](https://developer.sandbox.co.in/recipes/gst/gstr-3b/file_gstr_3b), [separate provider test/production environments](https://developer.sandbox.co.in/guides/developer-resources/environments), and [GST filing authorization guidance](https://tutorial.gst.gov.in/userguide/returns/GSTR3B_-_File_Nil_Return.htm). Production uses `api.sandbox.co.in` and live credentials; that hostname is not a test environment. Provider test access and a verified non-production taxpayer fixture remain required before any acceptance claim or release-flag change.

## Recovery verification on 20 October 2026 — local, not deployed

Implemented current-payable allocation, explicit zero-value credit posting, confirmed offset status recovery, actionable error cards, same-return reconnection and IMS completion routing. Unknown outcomes still never become permission to repeat a financial write. A changed snapshot clears stale approvals; rejected private edits are retained for correction.

Passing synthetic checks: regular GSTR-3B handler/screen, IMS handler/modal, nil handler/screen/flow, payment validation/screen, portal-resume, period navigation (including the real OTP reconnection screen), filing history, period closure, guided preparation, return validation and review. TypeScript and Expo lint pass. These tests do not contact GST or spend funds.

Browser QA did not reach an authenticated GST screen: the local web layout redirected the temporary synthetic route to sign-in and Metro reported an async-module loading error. The temporary route was removed and its preview server stopped; no authentication bypass was added. Physical-device and live-provider acceptance remain unverified. No new APK, frontend deployment, Edge Function deployment or release-flag change was made in this work.

Bank funding remains an explicit provider-capability gap, not a completed in-app checkout. Existing ledger offset is supported; public provider GST documentation does not supply a challan/bank payment-session API. The UI preserves the return around an official payment-page handoff and checks actual balances on return, requiring new allocation approval before offset.
