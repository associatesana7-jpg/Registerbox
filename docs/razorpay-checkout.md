# Website service checkout

The website uses Expo Router static pages and Supabase Edge Functions, with Razorpay Standard Web Checkout. No new frontend or Node SDK is needed: the browser loads Razorpay's official checkout script on demand, and the Deno backend calls the Orders and Payments REST APIs using built-in fetch and Web Crypto.

All 14 paid packages live in `supabase/functions/_shared/service-catalog.ts`, re-exported by `src/lib/service-catalog.ts`. Amounts are integer paise. The listed RegisterBox fee is the final checkout total; **no GST is added**. Government fees and statutory dues are excluded where the package says so. The ₹1,499 introductory GST package covers registration plus the first agreed filing month; further months require a separate agreement. Annual plans do not automatically renew. Eligible nil GST filing keeps its existing ₹0 workflow and never creates a Razorpay order.

## Configuration and deployment

1. Keep `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in Supabase Edge Function secrets. They are read with `Deno.env`; the secret is never returned to the website. The create-order response returns only the public key ID. Existing local `.env` Supabase values are preserved and `.env` is ignored by Git.
2. The migration `20261022163029_razorpay_service_checkout.sql` is applied to the connected Registerbox project. On a separate environment, apply that migration. It adds isolated account-owned checkout records. Clients can read their own records but cannot write amounts or paid status.
3. Deploy `create-order` and `verify-payment`. Both authenticate the bearer token with Supabase Auth before doing payment work. Function JWT settings in `supabase/config.toml` match this explicit verification.
4. Enable automatic capture in the Razorpay dashboard. A valid signature alone never marks an authorization paid: verification also fetches the payment and matches the stored order, amount and INR currency. Only `captured` is stored as paid.
5. Build the website using `npx expo export --platform web`, then publish the generated static output through the existing website deployment. Public service pages, packages, schema, sitemap and feed must be deployed together.

Use Razorpay test-mode keys for testing and live-mode secrets only when the account is ready to accept real payments. The website identifies test mode from the key returned by the backend.

## API contracts

`POST /functions/v1/create-order`: send a signed-in user JWT and `{ "package_id": "gst-registration", "idempotency_key": "a-client-generated-UUID" }`. Optional `business_id` must belong to that account. The server chooses the price from the catalogue; client amounts cannot change it. Returns `order_id`, `amount`, `currency`, `key_id`, `checkout_token`, `receipt`, `is_test_mode`. Minimum paid amount is 100 paise. For trademark packages also send `trademark` with `applicant_type` (`individual_msme` or `other`), `pan_or_gstin`, `brand_name` (maximum 50 characters), and integer `trademark_class` (1–45). These private details stay in the checkout record, not Razorpay notes.

`POST /functions/v1/verify-payment`: send the same account JWT and `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`, `checkout_token`. The backend uses its persisted order ID for HMAC-SHA256 of `order_id|payment_id`, verifies the provider payment, and stores the result idempotently. Missing or invalid signatures return 400. Invalid authentication returns 401. Provider failures return 500, with provider authentication failures mapped to 401. Authorized payments remain pending, and a paid record cannot be downgraded by a stale authorization response.

## Testing

Registration now follows **details → submit to RegisterBox → review fee → Razorpay checkout** on the website. GST, FSSAI, Shop & Establishment and Udyam payments are linked to the actual submitted application; company, LLP and other unpriced cases show a quotation step. Payment is also available from application progress. The additive `20261023073427_link_application_checkout.sql` migration enforces one active payment per application. Only the server can set this association or payment status. An uncertain provider-order response is retained for reconciliation before another order can be created.

Relevant blog guides and cards display catalogue prices, package scope, registration/process links and checkout links. Existing English, Hindi, Kannada and Tamil articles and official-portal links are preserved. Pricing panels are in English and state that no GST is added. Free nil filing guides have no paid checkout.

Run `node --test scripts/test-razorpay.mjs`, `npx expo lint`, and `npx tsc --noEmit`. Export the website and verify public HTML contains its service prices and links without signing in.

Start `npx expo start --web`, visit `/checkout?package=gst-registration`, sign in, complete and submit the registration, then review the ₹1,999 linked checkout and use the payment methods documented by Razorpay for test mode. Also test FSSAI ₹2,999, Shop & Establishment ₹4,499, Udyam ₹499, and a quoted company application. Test success, failure, dismissal, slow network and a verification retry. Reopen the application after payment and confirm that a second payment is blocked. Only captured and verified payments appear as `paid` in `service_checkout_orders`. A closing modal never establishes payment success. When verification is interrupted, retry verification before paying again.

Run `node --test scripts/test-application-payment.mjs` for registration submission, duplicate-click, failure/retry, native compatibility and safe auth redirects. Run `scripts/test-application-checkout-rls.sql` with a privileged SQL connection after the additive migration; all fixtures roll back. The 25 backend payment tests and five application-payment tests do not create real provider orders or charges.

No money is charged by the automated tests. A real provider test payment requires the merchant dashboard's supported test details. Server-to-server webhooks for recovery after a browser is permanently closed are a separate follow-up; until then, reconcile unresolved authorizations and payment references in Razorpay and retry website verification. A payment is an order for assistance; government filing remains subject to the existing review, eligibility and consent workflow.

## Search and advertising

Public service landing pages have canonical URLs and Service/Offer structured data. Their package prices and inclusions are statically rendered, linked in the service directory, and exposed in the sitemap and public service feed. Payment callbacks, account records and private form data are never included in discovery files. Deploying these changes makes the pages eligible for crawling; indexing and ad approval remain decisions of the search/ad platform. Submit the deployed sitemap in Google Search Console and use service landing pages as ad destinations.

Official references: [Razorpay integration steps](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/), [Supabase Edge Function secrets](https://supabase.com/docs/guides/functions/secrets), [Expo static rendering](https://docs.expo.dev/router/web/static-rendering/).

## Delivery verification (22 October 2026)

- Supabase migration applied; rollback-only database tests passed for server writes, owner isolation, client write denial, minimum amount, duplicate payment and idempotency constraints. No fixture users or receipts remain.
- `create-order` and `verify-payment` deployed and active with JWT verification. Remote OPTIONS returns 200 and unauthenticated POST returns 401 for both.
- 14 backend tests passed; frontend mocked success, failed signature verification, failure, dismissal and reload/recovery passed without making real provider orders or charges.
- Expo lint and TypeScript checks passed. Final static export: `/tmp/registerbox-checkout-final`; SEO checks passed for 40 public pages, 5 private routes and the 14 paid package offers.
- Website source and static export are ready for the normal frontend deployment. This task did not publish the full working tree to production; it contains unrelated ongoing changes. Google can discover the new pages after that website deployment.
- Still required: merchant checks for test/live key mode and automatic capture, one merchant-approved test checkout, and deployed sitemap submission in Search Console. Unresolved capture/reconciliation and refunds are managed through Razorpay; no webhook endpoint was added in this scope.

## Files created or modified for this integration

Backend and shared pricing:

- `supabase/functions/_shared/service-catalog.ts`
- `supabase/functions/_shared/razorpay.ts`
- `supabase/functions/create-order/index.ts`
- `supabase/functions/verify-payment/index.ts`
- `supabase/functions/.env.example`
- `supabase/migrations/20261022163029_razorpay_service_checkout.sql`
- `supabase/config.toml`
- `src/lib/service-catalog.ts`

Website checkout:

- `src/app/checkout.web.tsx`
- `src/app/checkout.tsx` (browser handoff fallback)
- `src/components/website/checkout.web.tsx`
- `src/components/website/checkout.css`
- `src/lib/razorpay-checkout.web.ts`
- `src/components/website/shell.web.tsx`
- `src/components/website/content.ts`

Public packages and services:

- `src/components/website/service-packages.web.tsx`
- `src/components/website/service-packages.css`
- `src/components/website/service-pages.ts`
- `src/components/website/service-page.web.tsx`
- `src/components/website/service-details.ts`
- `src/components/website/service-presentation.ts`
- `src/components/website/landing.web.tsx`
- `src/app/services/index.web.tsx`
- `src/app/services/udyam-registration.tsx` and `.web.tsx`
- `src/app/services/income-tax-filing.tsx` and `.web.tsx`
- `src/app/services/mca-compliance.tsx` and `.web.tsx`
- `src/app/services/digital-signature.tsx` and `.web.tsx`
- `src/app/services/proprietorship.tsx` and `.web.tsx`

Discovery, service information and checks:

- `public/robots.txt`, `public/sitemap.xml`, `public/llms.txt`, `public/service-feed.json`
- `src/app/policies.web.tsx`
- `src/components/privacy-notice.web.tsx`
- `src/components/website/privacy-retention.web.tsx`
- `scripts/generate-service-feed.mjs`
- `scripts/check-public-seo.py`
- `scripts/test-razorpay.mjs`
- `scripts/test-service-checkout-rls.sql`
- `README.md`, `docs/razorpay-checkout.md`
- `.env` (ignored): added server-secret guidance, preserving the existing Supabase configuration. `.gitignore` already excludes `.env`.
