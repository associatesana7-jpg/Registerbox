# GST IMS and filing recovery — 17 October 2026

## Customer flow

GSTR-3B `IMS002_CD` means the period's GSTR-2B is not generated, not that GSTR-2B needs filing. Open IMS from the same nil or regular return. Review each supplier invoice or explicitly select acceptance for eligible loaded invoices, approve and save decisions, then approve compute/recompute GSTR-2B. Read-only status polling tracks the stored reference. Once processing and document availability are confirmed, the modal closes and the saved return resumes. No return is filed automatically.

Nil declarations and the selected signatory remain in the mounted journey. The known IMS rejection can resume only after a matching GSTIN/period GSTR-2B is available and current filing history permits it. Regular returns fetch current portal values for comparison after IMS while preserving private figures; changed amounts require fresh review. The existing RT-3BAS1079 payment/portal recovery remains available.

20 October: reopening a previously completed computation checks its stored reference and matching document before returning to filing. Partial processing errors cannot be hidden by an older available GSTR-2B. Non-availability is distinguished from session, identity and provider errors. After 20 automatic checks, the UI explicitly pauses and offers read-only continuation. Unknown writes without a provider reference remain tracked for support rather than being replayed. Session errors offer reconnection back to the same saved return.

GSTR-1 and GSTR-3B resend the filing OTP directly without resetting declarations or replaying preparation. Server cooldown, snapshot freshness, specific filing consent, duplicate protection and unknown-outcome safeguards remain enforced. Filing codes accept letters and numbers.

The GST landing page no longer clears filing status when switching between form tabs without triggering another fetch. Filing history refreshes on route focus/app foreground/browser focus. Rejected operations refresh the saved server draft instead of retaining a stale client revision.

GST opens with GSTR-1 selected. Confirmed filing for that period advances the landing tab to GSTR-3B. Each newly selected period restarts at GSTR-1 unless its fetched history confirms it filed. Users can still explicitly inspect an already-filed GSTR-1; submitted/pending/unknown statuses never count as filed.

## IMS boundaries

- IMS is a live invoice queue spanning source periods, not an invoice list filtered to the selected GSTR-3B month. Each document's source period is shown.
- The selected period controls GSTR-2B computation and the return to resume.
- Save uses the server-fetched immutable invoice identity and previous action, revalidated immediately before submission.
- Acceptance of credit notes/amendments requiring ITC-reduction declarations is routed to GST rather than inventing declaration values. Accept-all covers eligible ordinary invoices/debit notes only.
- Maximum 500 selected records per save and 5,000 fetched records. Large-account review can use GST portal; no partial provider downloads are silently saved.
- Started/pending/unknown writes are never automatically replayed. Partial errors remain visible and require refreshing/reviewing current actions.
- IMS workspace and operation tables have RLS and no anonymous/authenticated direct table privileges. The JWT-protected function enforces business ownership, GST session scope, connection lock, current filing history, consent and rate limits.
- No taxpayer acceptance, offset, recomputation or legal filing was performed during automated testing.

## Interface

Shared GST controls use larger touch targets, readable typography, calmer spacing, rounded cards, a single accessible visual checkbox component and explicit loading/error paths. IMS uses a full-screen modal and preserves the underlying return. No added motion, so reduced-motion preferences are respected. Android tab height and bottom padding include the actual safe-area inset rather than a fixed 9-pixel allowance.

## Verification

- `node scripts/test-gst-ims.mjs` — real handler with synthetic DB/provider: isolation, consent, stale selections, duplicate pending/unknown guards, release lock, save/compute tracking, 2B availability, declarations.
- `node scripts/test-gst-nil-handler.mjs` — known IMS rejection recovery, existing nil preparation/OTP/duplicate safeguards.
- `node scripts/test-gst-nil-screen.mjs` — actual shared nil screen with synthetic hooks: both forms resend directly, retain declarations and reuse signatory; tab/safe-area regression assertions.
- Existing GSTR-3B handler/screen, payment, nil-flow and portal-resume suites.
- Expo lint, TypeScript and Deno checks.
- Browser visual/interaction checks at desktop and 390×844 using a temporary synthetic-only route, removed before release. Physical Android system-navigation verification and live taxpayer/provider acceptance remain separate checks.

Provider contracts: [IMS overview](https://developer.sandbox.co.in/api-reference/gst/compliance/guides/taxpayer/invoice-management-system/overview), [save invoice actions](https://developer.sandbox.co.in/api-reference/gst/compliance/endpoints/taxpayer/invoices/save), [regenerate GSTR-2B](https://developer.sandbox.co.in/api-reference/gst/compliance/endpoints/taxpayer/gstr-2b/regenerate_gstr_2b), and [regeneration status](https://developer.sandbox.co.in/api-reference/gst/compliance/endpoints/taxpayer/gstr-2b/gstr_2b_regeneration_status).
