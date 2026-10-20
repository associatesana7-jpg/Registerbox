# Udyam, country policy and analytics correction

21 October 2026.

- Udyam application copy presents paid RegisterBox preparation/review, not a government filing or certificate sale. Removed repeated free/paperless messaging from application screens. One public fee explanation distinguishes the assistance charge from the government's no-fee registration.
- Optional existing Udyam/GST certificates follow existing-registration answers. Applicants with neither skip the empty document phase. No Aadhaar copies or OTP collection was added.
- The Cloudflare gateway checks trusted incoming country metadata before auth/status/remember handling, including inactive rollout fallback. Public pages remain globally accessible. Direct Supabase Auth remains outside this gateway's country boundary; this is not a complete upstream geofence.
- `@vercel/analytics` 2.0.1 uses the React adapter on web only. Exact public URL allowlist; no auth/application/dashboard/admin pages, query strings, fragments or custom events. HTTPS production hosts only, strict-origin referrer policy. Native app renders a no-op component. English/Hindi privacy notices updated.

Verification: Expo lint and TypeScript check passed. Udyam, application navigation, public analytics, country gateway and existing adaptive-auth tests passed. Web export passed; audit covered 18 articles, 13 service pages, 37 sitemap URLs and 2,657 links/assets. External source response caveats remain in the startup-guide publication ledger.
