# RegisterBox deletion requests

Public request page: https://www.registerbox.in/delete-account. Mobile: Account → Request account or data deletion. Signed-in requests are persisted in `privacy_deletion_requests`; locked-out users can email registerbox@yahoo.com. No user records are erased by submitting a request.

SUPER_ADMIN and SECURITY_ADMIN receive an in-app notification on insertion. Authorized operators must inspect the Supabase queue daily; the application does not automatically fulfill deletion requests. `target_at` is the 30-day target response date, not a claim of completed deletion.

## Fulfillment

1. Verify account ownership. Email-origin requests need ownership verification before they are entered by a privileged operator. Never ask for passwords, OTPs or Aadhaar/PAN copies by email.
2. Mark the request `processing`. Review shared-business ownership and identify the requested rows and private storage objects, including AI/provider copies where applicable. Never delete another business member's records merely because the requester can access them.
3. Identify any transaction, filed-return or legal-hold records that must remain. Document the basis and a concrete `retained_until` date; communicate the specific data and date to the requester. Do not invent a universal statutory retention period.
4. Revoke sessions/access for account deletion, remove eligible database and storage records, and delete the Auth account only after dependencies and storage have been resolved. Check surviving references before deletion. A cascade alone does not delete Storage objects or immediately invalidate issued JWTs.
5. Verify the requested records and files are gone. Confirm by email for an account request. Store a minimal, non-sensitive resolution in `response`, set `resolved_at`, and mark `completed` or `retained`. The database requires a response and resolution time, and requires an end date for `retained` requests.
6. Reapply fulfilled deletions before any backup restoration returns to service. Document provider backup expiry and provider deletion outcomes in the resolution rather than promising instant backup erasure.

The scheduled receipt cleanup removes only closed request receipts older than 12 months, and waits until any declared retention end date has passed. It never deletes business records. Customer access is SELECT-own and INSERT-own only; no customer can alter status or submit another user's ID.

Before Play submission: deploy the website, verify the public request page without login, ship the new mobile build, and use `/delete-account` for both deletion URLs. Validate a request and receipt with a disposable test account and fulfill it through the operator process before claiming operational readiness.
