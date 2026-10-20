# India sign-in restriction

The dedicated Cloudflare auth Worker accepts `/auth`, `/remember` and `/status` only when Cloudflare supplies an allowed country in the incoming `request.cf.country`. The default and committed `ALLOWED_AUTH_COUNTRIES` value is `IN`. Missing geolocation, unknown `XX`, malformed configuration and other countries receive HTTP 403 with `code: "region_not_allowed"`, before risk counters or upstream calls. Caller headers and JSON country claims are ignored.

`GET /status` applies the same restriction even while `AUTH_GATEWAY_ACTIVE` is false. This prevents the application's status check from permitting its pre-rollout direct-auth fallback outside India. An allowed status response includes `active` and `allowedCountries`; it does not expose IP addresses. The frontend must treat status failures as failures, rather than falling back to direct Auth.

`OPTIONS` requests remain available for CORS preflight. `GET /health` returns only `{ "ok": true }` without a country requirement, suitable for uptime checks. Public website and blog routes are not served by this dedicated Worker and need no country restriction.

## Verification

Run from the repository root:

```sh
node scripts/test-auth-country-gateway.mjs
node scripts/test-auth-risk-gateway.mjs
```

The focused country tests execute the actual handler with synthetic edge metadata. There is no production test flag or missing-geolocation bypass. They cover India, foreign/missing/unknown locations, spoofed headers and JSON, inactive status, remembered devices, strict configuration, preflight, health checks and the existing CAPTCHA challenge path. The existing suite also checks real SQLite counter reservations, rate limits, challenge replay/hostname/action checks and client failure behavior.

## Deployment setup

Deployed 21 October 2026 via the connected Cloudflare account to the existing Worker. Deployment ID: `09d6b02e8a8e48b4a77bff689bc6fb50`. Existing secret bindings and Durable Object namespace were retained. Live India browser check returned HTTP 200 with `allowedCountries: ["IN"]`; `/health` returned `{ "ok": true }`. Foreign/missing/spoofed-location rejection is covered by the actual-handler tests; an independent live foreign connection has not yet been verified.

The changes do not activate the adaptive gateway or change CAPTCHA backstop flags. Keep `AUTH_GATEWAY_ACTIVE` and `AUTH_CAPTCHA_BACKSTOP_VERIFIED` at their previously verified values; the committed values remain `false`. `ALLOWED_AUTH_COUNTRIES` is a public configuration value, not a secret. Do not place credentials in Wrangler `vars`.

After confirming the intended Cloudflare account and existing Worker, deploy from the repository root:

```sh
npx --yes wrangler@4.151.1 whoami
npx --yes wrangler@4.151.1 deploy --config workers/auth-gateway/wrangler.jsonc
```

If the adaptive gateway is activated separately, its existing `AUTH_RISK` Durable Object binding, `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET`, `AUTH_RISK_SECRET` and hostname/backstop configuration are still required. This country patch adds no credentials or new external service.

Verify the deployed `/status` from an India connection and a non-India connection, and `/health` from either. Cloudflare dashboard/Playground preview does not provide incoming `request.cf`, so sign-in/status there deliberately fail closed. Geolocation describes the network connection, not citizenship; VPN egress may change the detected country.

This Worker cannot restrict callers that bypass it and contact public Supabase Auth endpoints directly. A platform-wide account-creation restriction requires corresponding enforcement at that upstream boundary. Do not claim that deploying this Worker alone geofences every Supabase Auth request.

## Official references

- [Incoming Request metadata and `country`](https://developers.cloudflare.com/workers/runtime-apis/request/#incomingrequestcfproperties)
- [Wrangler environment variables](https://developers.cloudflare.com/workers/wrangler/configuration/#environment-variables)
- [Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/)
