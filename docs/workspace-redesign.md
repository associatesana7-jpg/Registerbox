# Customer workspace redesign

## Direction

Mobile-first business workspace: ink/navy, warm neutral surfaces, cobalt actions,
restrained status colours and consistent Material Symbols. Use UI/UX Pro Max
for visual hierarchy, stable layouts, 44px+ controls and mobile/desktop QA.
No new animation or native dependency was introduced. The icon font is committed
as an asset with its licence, not resolved from an undeclared package.

## Connected journeys

- Home prioritises an open customer request, a saved application draft, then an
  active application. Counts reflect fetched records, not example statistics.
- Saved applications resume at their first invalid/unanswered conditional
  question. Complete answers resume at Documents, never a fabricated submission.
- Applications link to scoped progress details and the same business's vault.
- Documents support search, categories, upload, private opening/downloading and
  a return link to the selected application. Upload does not imply verification.
- GST keeps GSTR-1 first and advances only on confirmed filing. Optional tools
  are disclosed separately. Unknown writes, consent, revision and duplicate
  guards remain intact. Nil filing keeps declaration → OTP → receipt.
- Purchases disclose manual entry and accounting imports separately, and offer
  a period-selection recovery instead of a dead end when opened without a month.
- Account shows real profile details; non-persisted notification switches and a
  hard-coded location/business constitution were removed.
- AI retains provider consent, draft review and explicit filing authorization.
  The input is above navigation; there is no duplicate keyboard-avoiding wrapper.
- Legacy plan review no longer displays an invented fixed bundle total.

## Validation / release status

Local only. This redesign has not been published, pushed or packaged into a new
APK. Previous production updates/builds do not contain this whole redesign.

Checks: Expo lint, TypeScript, workspace resume/status tests, application routing
and intake tests, GST nil and regular-screen/handler regression suites, IMS,
payment, portal recovery and default-period navigation. Production web and
Android bundle exports were exercised; this is not live GST provider acceptance.

Browser QA: desktop and 390×844 web; Home, saved application continuation,
Applications, Documents, Account and AI. Verified no horizontal overflow and AI
send button bottom 760px, navigation top 776px at 390×844. A global web button
reset was narrowed to public marketing pages after it was found to strip app
button backgrounds. Native physical-device safe-area/keyboard QA remains needed.

The customer workspace is redesigned; the public marketing site and staff admin
panel are not claimed as newly redesigned in this change. Existing records and
server filing behavior have not been reset or bypassed.
