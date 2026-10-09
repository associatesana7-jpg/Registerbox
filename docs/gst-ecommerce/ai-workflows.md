# GST assistant workflow integration

The assistant and mobile app share `supabase/functions/_shared/gst-assistant-knowledge.ts`, version 2026-10-09.1. This is reviewed retrieval context, not self-training from customer chats. Update this catalogue whenever supported operations, provider contracts or validated tax mappings change, run the assistant handler tests, and deploy registerbox-ai with the matching mobile release.

The AI tab can open the existing filing workflow, upload common-format platform/POS CSVs, review TCS workpapers and upload purchase-bill images. Imports use the same owner-checked persistence, duplicate detection, source retention and review components as GST Returns. The selected business and explicit period determine the destination. Uploading does not file a return or establish ITC eligibility.

Model context contains supported capabilities, connection state and limited return workflow status. It excludes GSTINs, PANs, signatories, invoices and financial amounts; common sensitive identifiers in questions are redacted. External-model consent is required. An allowlist maps action IDs to app screens; generated paths and mutation commands are rejected. Only the normal reviewed filing workflow may request OTP or submit a return.

GSTR-8 is a source workpaper only. On 2026-10-09 the product owner confirmed Sandbox is the only provider and no GSTR-8 API documentation is available. Do not advertise GSTR-8 filing. Native Swiggy/Zomato exports still require anonymized fixtures and verified adapters.

Table 15A review links acknowledged, reconciled, integrity-checked local filing archives and displays replacement differences. Evidence explicitly says `local_filed_archives` and `portalHistoryVerified: false`. Missing originals, ambiguous records, recipient/supplier changes and earlier corrections block submission. Complete external GST amendment history retrieval remains unimplemented; even enabling the broader ecommerce write flag cannot bypass this requirement.

## Validation and deployment

- All 18 GST test scripts passed; local typecheck and Expo lint passed.
- gst-returns v22 and registerbox-ai v11 deployed with JWT verification and exact source read-back verification.
- Amendment evidence migration applied; draft table remains service-only with RLS.
- No GST return was saved, offset, authorized or filed as a development test. No provider capability flags were enabled.
- EAS project: kartpinindia/registerbox-ai, ID 351fe150-5d6d-4aca-a9d6-02d775fc2555. A linked project or JS bundle export alone is not an installed native release.
