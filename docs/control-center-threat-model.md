# RegisterBox Control Center threat model

## Scope and security objective

Phase 1 covers staff OTP sign-in, database-backed RBAC, the Operations Command Center, audit events, and compliance-expiry notifications. The security objective is that a customer account, a modified client, or a stolen public Supabase key cannot access staff data or perform an admin operation.

## Assets

- Staff sessions, role assignments, permissions, and offboarding state.
- Customer PII, identity records, business records, documents, payments, and government application data.
- Compliance rules, workflow state, Groq prompts/results, connector state, and notification queues.
- Audit evidence: actor, action, entity, timestamp, reason, and correlation context.
- Server-only credentials: Supabase service role, Groq key, Resend key, connector secrets, and future WhatsApp credentials.

OTP values, passwords, API keys, full PAN, and Aadhaar must never appear in AI input, notification payloads, analytics, or audit logs.

## Actors and privilege levels

- Customer: accesses only owned or explicitly shared businesses.
- Invited staff: authenticated but has no Control Center access until an active staff profile and role exist.
- Operations/compliance/support/finance staff: least-privilege permissions from database role mappings.
- Super Admin: broad permissions, but cannot bypass audit logging or maker-checker controls.
- System jobs: enqueue reminders and perform maintenance without an interactive user.
- External providers: Groq, Resend, future WhatsApp/SMS, GST and government connectors.
- Attacker: unauthenticated user, compromised customer account, malicious staff member, or attacker with a copied public key/client bundle.

## Trust boundaries and data flow

1. Admin browser to Supabase Auth: email OTP creates a short-lived authenticated session. OTP is one-time authentication, never a stored password.
2. Admin browser to `control-center` Edge Function: bearer JWT crosses the public network. The function validates the token with Supabase Auth.
3. Edge Function to RBAC tables: the function checks active staff identity, assigned roles, and permission keys on every request.
4. Edge Function to customer/business tables: service-role access occurs only after authorization; responses are minimized and masked.
5. Database cron to notification outbox: a private SQL function reads expiry dates and writes deduplicated alerts. It is not executable by client roles.
6. Notification worker to providers: future delivery workers resolve email/phone server-side. Queue payloads contain record IDs and dates, not destination addresses or identity documents.

## Priority threats, controls, and verification

| Threat | Primary control | Verification |
| --- | --- | --- |
| Customer opens the admin route | Active `staff_profiles` record plus database roles required by Edge Function | Invoke with a customer JWT; expect 403 |
| Client changes an email/role flag | Authorization ignores client values and `user_metadata` | Modify request body; access remains unchanged |
| Public key reads RBAC tables | RLS enabled, grants revoked from anon/authenticated | Data API selects return no rows/permission denied |
| Stolen staff session remains useful after offboarding | Status checked on every request; future offboarding revokes sessions | Mark staff suspended; next request returns 403 |
| Service-role key leaks to client | Key exists only in Edge Function environment | Search bundles/repository and inspect network responses |
| Staff reads excessive PII | Dashboard endpoint returns no PAN, GSTIN, phone, document path, or full customer email | Response contract test and log review |
| Expiry reminders spam users | Deterministic unique dedupe key per record, expiry date, window, and channel | Run enqueue twice; second run creates zero duplicates |
| External alert sent without consent | In-app alerts are default; email/WhatsApp/SMS require enabled preferences | Test no external queue row without preference |
| Notification queue leaks PII | Payload stores source IDs, expiry date, and window only | Inspect recent `notification_runs.payload` |
| Audit trail is altered from admin UI | Client roles cannot update/delete audit events; writes occur server-side | Attempt authenticated update/delete; expect denial |
| Groq receives protected values | Admin dashboard never sends customer data to Groq; future Copilot must permission-filter and redact | Prompt payload inspection and regression tests |
| Cross-origin browser abuse | Strict Control Center origin allowlist plus bearer authentication | Preflight from an unapproved origin is rejected by browser policy |

## Residual risks and next controls

- Email OTP proves mailbox control but is not phishing-resistant MFA. Add TOTP/WebAuthn for admin accounts before high-risk production operations.
- The current customer schema has legacy staff access based on JWT `app_metadata`. The Control Center does not use it, but it should be replaced by permission-scoped server commands as modules move into the admin application.
- Provider delivery workers are intentionally not enabled until sender domains, customer consent, unsubscribe behavior, retry policy, and secret storage are configured.
- Admin and customer web deployments should use separate origins, CSP policies, monitoring, and release pipelines even when they share a repository.

## Customer uploads in the Control Center

Customer uploads cross three boundaries: the customer app, the private `business-documents` bucket, and the staff Control Center. The admin directory therefore returns document metadata without `storage_path` or permanent URLs. A staff member with `document.download` must provide a 12–240 character business reason; the Edge Function then creates a 60-second signed URL and records `DOCUMENT_ACCESSED` in `audit_events`.

Verification:

- Directory responses must not contain `storage_path`, service credentials, PAN, GSTIN, phone numbers, or full registration numbers.
- Requests without an active staff record or `document.download` return 403.
- Invalid document IDs and missing access reasons return 400.
- Each successful preview creates an audit row naming the staff actor, document entity, reason, and URL lifetime.
- Storage remains private; never convert `business-documents` to a public bucket.

Residual limitation: signed URLs remain usable until their short expiry and cannot be revoked individually. Keep the lifetime at 60 seconds, avoid logging the URL, and require a fresh authorization check for every preview.
