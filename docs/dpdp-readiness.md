# RegisterBox DPDP readiness - 14 October 2026

This is a technical implementation and evidence register, not legal certification. No guarantee of regulatory approval or absence of penalties is made. RegisterBox is the operator name supplied by the owner; its legal constitution and a named accountable privacy/incident owner still need confirmation. The owner approved the published Bengaluru address and registerbox@yahoo.com for privacy requests and stated that there is no legal adviser.

## Official sources reviewed

- [DPDP Act 2023, Act 22 of 2023](https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf): applicability; consent and legitimate uses; processor contracts; accuracy; safeguards; cessation/erasure; children's/lawful-guardian consent; access, correction, erasure, grievances and nomination.
- [Act commencement, G.S.R. 843(E)](https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf).
- [Final Rules 2025, G.S.R. 846(E)](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf), including the relevant schedules.
- [English corrigenda, G.S.R. 892(E)](https://www.meity.gov.in/static/uploads/2025/12/3c7ebbae0e5456f493f486e6845df86b.pdf).

The notifications are dated 13 November 2025 and use phased commencement measured from Gazette publication. The Act's substantive processing obligations and rights, and Rules 3, 5-16, 22 and 23, have an eighteen-month phase; Consent Manager registration has a one-year phase. On 14 October 2026 these later phases must not be described as already universally operative. The Gazette cover and December correction were checked; use the actual publication evidence when confirming exact calendar deadlines with a qualified reviewer. These controls are implemented in preparation, not as a claim that every future rule is already binding.

RegisterBox's own preference UI is not a registered statutory Consent Manager. No Consent Manager designation, exemption, SDF designation or special child-processing exemption is assumed. No seven-year Consent Manager retention obligation is automatically applied to an ordinary app.

## Connected controls

| Requirement | Implementation / evidence | Remaining limitation |
| --- | --- | --- |
| Itemised notice, purpose and recipients | Shared EN/HI notice, separate AI purpose notices, privacy email and published address; `/privacy` and `/policies` on mobile/web | Hindi text and legal-entity/role details require human confirmation |
| Specific affirmative optional consent | Separate AI assistance and bill-image AI purposes, off without current versioned permission; exact notice snapshot and language recorded | Existing mandatory service flows need lawful-basis and notice-evidence review |
| Comparable withdrawal | One-action withdrawal; backend checks current permission before new AI calls | Already in-flight work is not remotely cancelled; processor follow-up must be fulfilled |
| Processor cessation / erasure | Withdrawal atomically creates a tracked processor task, staff alert and audit; operator records confirmation or a lawful retention basis/end date | Provider erasure APIs/contracts and backup erasure are not verified; completion is operator-reported |
| Access / correction / grievance / nomination | Owner-scoped request queue, receipt, 30-day target, operator response, evidence reference and immutable closed case | A receipt is not fulfillment. Nomination does not grant account access. Identity/authority must be verified |
| Account/selected erasure | Existing `/delete-account`, owner verification, operator queue and retention explanation | Actual account/storage/provider erasure remains a controlled operator operation, not a new automatic purge |
| Security / access | New tables have RLS, owner reads, no direct customer writes, no customer access to internal evidence; operator roles are resolved server-side | This is not an exhaustive security audit; password leak protection is disabled in current Auth configuration |
| Children / lawful guardians | Notice explicitly explains verified authority; self-service AI grant requires adult declaration and cannot infer parental verification | All-age personalised service is NOT production-qualified. Reliable parent age/identity, consent and lawful-guardian verification must be built and tested before collecting child data. A declaration is not age verification |
| Retention / transfers | Notice avoids false instant-erasure and India-only claims; task retention requires reason and date; Supabase project region checked as ap-south-1 | No approved category-level retention or processor/backup schedule; broader provider locations/contracts need review |
| Incident response | Operational runbook below and responsible-role queue | No automatic breach detection, regulator filing, email notification or completed incident exercise is claimed |

## Operational runbook

1. Assign a named privacy/incident owner and a deputy. The live role query found one active SUPER_ADMIN/SECURITY_ADMIN recipient. Access `/privacy-operations` after staff sign-in. Have someone actually monitor the approved mailbox and queue. Test response to a disposable user's request before claiming operational readiness.
2. For access, prepare an account-specific summary of processed personal data, purposes and actual recipients. Exclude another individual's data, protected secrets and any legally restricted disclosure. Deliver through a verified channel; record the delivery reference.
3. For correction, verify the request and authority, change the correct source record, identify downstream corrections, and record evidence. Do not overwrite an immutable filed government return through this privacy workflow.
4. For erasure, inventory database rows, Storage objects, identity/GST sessions, AI records, processor copies, notifications, backups and linked/shared business records. Identify the exact legal basis and end date for each exception. Revoke sessions/access, fulfill approved erasure, get processor confirmation, tell the requester what is retained and why, and preserve minimal evidence. Do not delete tax/customer records from a broad unaudited SQL command. Reapply completed erasures when restoring backups. No real customer data was erased for this implementation.
5. For withdrawal, stop new consent-based processing, use the processor task to obtain cessation/erasure confirmation or document a lawful exception, and report its status. A failed/unavailable consent query must fail closed. An older screen must not silently override a newer withdrawal.
6. For nomination and guardian reviews, verify the nominee/guardian, death/incapacity or lawful authority, parent's reliable adult identity/age, the appropriate consent and the scope before enabling any delegated access or child processing. A support enquiry or ordinary checkbox is not evidence. Public service information can remain available to all ages while this capability is unresolved. The Play listing's 18+ audience must not be silently changed to a child audience.
7. Approve a retention matrix: category, purpose/lawful basis, source, processor, location, last-processing time, minimum/maximum period, legal hold, erasure deadline, review owner and backup treatment. Rules 6 and 8(3) include one-year requirements in their later phase; the three-year inactivity schedule applies only to its specified classes/thresholds. Do not assign three years to every RegisterBox record or purge business documents merely because a request receipt is twelve months old.
8. Obtain/review processor agreements, security terms, subprocessor and location lists, erasure mechanisms, breach communication and backup practices for Supabase, Vercel, Expo, Groq and configured Sandbox/government/identity services. Do not claim the Act imposes a blanket India-only hosting requirement.
9. On an incident: record awareness time, contain access, preserve evidence securely, assess affected people/data and likely consequences, appoint a response lead, document mitigation and safety advice, and prepare contact details. When applicable Rule 7 is in force, affected principals and the Board need notification without delay; the detailed Board follow-up has the separate 72-hour requirement (or approved extension). Do not treat 72 hours as permission to wait before initial notices. Verify other applicable incident duties independently. Record delivery evidence and unresolved facts; only an authorised human sends regulator/customer communications.
10. Review the leaked-password-protection advisory, staff MFA, token/session revocation, database/Storage policies, access logs, backup recovery and retention, vendor controls and incident exercise. Do not represent RLS-enabled tables alone as a complete security audit.

## Verification

- `node scripts/test-dpdp-privacy.mjs`: real handler with synthetic auth/database; explicit versioned notice, EN/HI snapshot, withdrawal, stale-grant prevention, ownership, invalid/unverified grants, minimal identifiers, duplicate requests, active operator roles, response evidence, processor evidence and immutable closed cases.
- `scripts/test-dpdp-rls.sql`: production database rollback-only fixtures; own/cross-user/anonymous access, direct-write denial, internal evidence protection, consent/case/processor audit, withdrawal task and NULL-evidence rejection. Auth fixtures, requests, alerts and audit events are rolled back.
- Existing GST and account-session regressions, Expo lint and TypeScript typecheck.
- Deployment/source/readiness evidence must be recorded separately. Mock success is not live customer/request fulfillment, legal certification, verified parental consent or processor-contract acceptance.
