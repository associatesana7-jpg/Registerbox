# Payment operations

Open **https://admin.registerbox.in/control-center → Payments & recovery** in the Control group.
SUPER_ADMIN, COMPANY_ADMIN and FINANCE_USER receive the new finance permissions.
Other roles require explicitly assigned permissions; a client-side role name cannot grant access.

## What the team can see

- Customer name and contact details, business, service package and application reference.
- Checkout visits before an order exists, checkout opens/dismissals, reported failures and verification problems.
- Server-created orders, verified provider attempts, captured payments, processed refunds and dispute alerts.
- A chronological file showing whether each observation came from the browser, server, Razorpay or staff.
- Search, server-side filters/pagination, separate live/test/unknown environments, and daily dates in Asia/Kolkata.
- Follow-up status, internal notes, audited provider reconciliation, and CSV exports with a required reason (maximum 500 rows).
- Notes and follow-up from an earlier checkout visit remain attached when that journey creates an order.
- Signing-secret/delivery health, unmatched events and records needing reconciliation. The page refreshes every 30 seconds while visible.

Browser activity cannot mark an order paid. Only signature-verified provider evidence with matching order, amount and currency can do so. A captured payment is not proof of bank settlement. Refunds remain separate from the original receipt. Inactivity after 30 minutes suggests review; it does not prove abandonment. Previously unrecorded browser actions cannot be reconstructed. Historical orders with no recorded environment remain **unknown** and are excluded from live revenue.

## One-time Razorpay webhook activation

The deployed function is:

`https://qbubmmwtycupfqbbmqpu.supabase.co/functions/v1/razorpay-webhook`

1. In Supabase Edge Function secrets, set **RAZORPAY_WEBHOOK_SECRET_LIVE** to a new strong webhook signing secret. This is a separate credential from RAZORPAY_KEY_SECRET.
2. In Razorpay's **Live mode → Account & settings → Webhooks**, add the URL above and enter exactly the same signing secret.
3. Enable `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`, `refund.created`, `refund.processed`, `refund.failed`, `payment.dispute.created`, `payment.dispute.won`, `payment.dispute.lost` and `payment.dispute.closed` when available in the account.
4. Save/enable the webhook. Use a provider test delivery and confirm its result and the admin health timestamp. A configured secret alone does not prove delivery.

For a separately configured test webhook use RAZORPAY_WEBHOOK_SECRET_TEST. Refund/dispute events that require a provider lookup must match the mode of the configured API key. An optional RAZORPAY_WEBHOOK_SECRET_PREVIOUS supports signed retries during rotation of the current API-key environment. Never put signing secrets, API secrets or service-role keys in browser environment variables or Git.

Until webhook activation, successful browser verification still records captured payments; staff can reconcile a saved order with Razorpay. Browser-independent refund/dispute and delayed-success updates require the webhook. Reconciliation only performs provider GET requests; it does not create orders, capture, debit or refund funds. There is no scheduled reconciliation job in this release.

## Operating the queue

1. Check **Needs attention**, **Failed**, **Stopped / inactive**, webhook errors and unmatched events.
2. Open a file and compare customer, application, amount and provider IDs.
3. If status is uncertain, enter a reason and choose **Reconcile with Razorpay** before contacting the customer. A lost create-order response can be recovered by the original receipt.
4. Record follow-up as open/contacted/resolved and add an internal note. This does not send email or WhatsApp.
5. Process refunds and respond to disputes in Razorpay, then review the synced evidence. This release does not initiate financial actions.

Valid webhook deliveries authenticate the exact raw request body with HMAC-SHA256. The database atomically deduplicates delivery IDs/body hashes and applies observations; out-of-order events cannot downgrade captured payments or processed refunds. Failed/unmatched deliveries return a retryable response and remain available for investigation. Raw webhook bodies, signatures, card data and UPI identifiers are not stored.

All new operations tables have RLS and no customer/public grants. Only authenticated Edge Functions using the server service role can write them. Staff access is checked against database permissions. Event history and staff notes are append-only for the service role. View/export/reconciliation/follow-up actions are audited.

## Verification

Run `npx expo lint --no-cache`, `npx tsc --noEmit`, and:

```sh
node --test scripts/test-application-payment.mjs scripts/test-razorpay.mjs scripts/test-payment-journey.mjs scripts/test-payment-operations.mjs
```

`scripts/test-payment-operations-rls.sql` is a rollback-only database integration fixture. It can run as service_role and checks ownership, duplicate protection, captured receipts/alerts, refund monotonicity, amount/mode binding and restricted grants. It creates no provider payments and rolls back its database fixtures.

For acceptance, complete a Razorpay test-mode payment with matching test credentials in a test environment; confirm that the customer, application, provider IDs and timeline agree. Check dismissal, failure, refresh after payment, duplicate/out-of-order webhook deliveries, refunds and a staff account without payment permissions. Do not treat test records as live receipts.
