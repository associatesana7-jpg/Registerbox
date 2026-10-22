# Client register and renewals

Staff open **Clients & renewals** in Control Center. This is an internal service register, not a government submission integration.

## Existing clients

- Add a company manually, then add any number of service records.
- Or import `.xlsx` (first worksheet) / `.csv`, at most 100 data rows and 2 MB per file.
- Download the template in the panel. Remove its example row. Use one row per service; repeat the client details.
- Supported service labels: FSSAI, LABOUR, MSME, IEC, TRADEMARK, ITR, GST, OTHER. TM, LABOR and UDYAM are accepted aliases.
- Review the preview and confirm authority before saving. Invalid rows block the preview import; server errors are reported per row. Retrying an unchanged batch preserves matching records rather than overwriting them.
- Client matching uses the import fingerprint, or company + exact phone/email. Ambiguous matches need staff review. It never merges clients based on name alone.

## Dates and work

- Registration/issue date and expiry/due date are optional.
- Choose expiry, filing deadline, review reminder or no date. The app does not infer statutory validity or an ITR deadline.
- Overdue / next 30, 60, 90 days / no-date filters show service records. Boundaries use Asia/Kolkata and include the due date.
- Start a renewal/follow-up case, reuse the existing client file, and keep preparation/submission/completion notes. One open case per service record.
- Verify that old details and documents remain current and that reuse is authorised before applying.
- Upload new certificates and add renewed service records; mark prior staff records renewed. Historical files are not overwritten.
- Correct app-linked issue/expiry dates only against the certificate. This is an audited metadata correction, not a government status update.
- This release provides on-screen tracking, not new email/WhatsApp notifications for imported clients.

## App linkage

Existing and new business profiles are indexed automatically. Live views show their licence/registration records, and the client file reads their original documents, including staff-issued certificates. No duplicate file copy is made. Customer applications can be opened from the linked client file.

Legacy clients do not require an Auth account. A legacy client who later creates a separate app business is not automatically merged on a possibly shared phone/email; review both records before consolidating. No cross-account document access is granted.

## Security and implementation

- `admin_clients`, `admin_client_services`, `admin_client_documents`, `admin_renewal_cases`: RLS enabled; no customer/anon table grants or policies. Edge Function authenticates active staff and current permissions on every request.
- Read requires customer.read + business.read; detail also requires document.read; writes require application.update. Upload additionally requires document.verify, download requires document.download and a reason.
- Private `admin-client-documents` bucket; PDF/JPEG/PNG content signature and 10 MB limit; 60-second signed download links after an audit event. Restrictive Storage policy denies direct customer/anon access even if another policy is permissive.
- Uploaded documents are optional. Prefer masked Aadhaar when sufficient. Never put document contents or identity numbers into logs.
- Internal trigger is security-definer solely to provision a CRM index row on new business creation. It is in a non-exposed schema with execution revoked from client roles. Import RPC is security-invoker and callable only by service_role.
- Supabase's “RLS enabled, no policy” information notices are intentional for these server-only tables.

## Verification

`node --test scripts/test-client-register*.mjs`, `npm run lint`, `npx tsc --noEmit`, `npx expo export --platform web`.

Database rollback test checks repeated import idempotency and renewal-watch visibility. No test customer data is retained. Full staff-login/document-upload UI validation requires a staff session.
