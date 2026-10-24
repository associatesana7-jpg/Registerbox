# Release checkout UI QA

24 October 2026. Source checkout: `/Users/bhavnaosthwal/.codex/worktrees/desktop-workspace-redesign/registerbox`, based on origin/main `7945a684aed1ccab04d2f78d1dcd2e7f8af11293`. This is a limited recheck of the release selection after unfinished cloud-Tally work was excluded; it supersedes earlier cloud-company Account/Home screenshots for release scope.

The isolated loopback preview at http://127.0.0.1:4178/dashboard now bundles these release sources through `build-release.mjs` / `entry-release.tsx`. The original workspace and git state were not modified by QA. Real release web components, styles, primitives, icons and package/payment presentation remain mounted. The metafile confirms 37 release app-source inputs, zero original-workspace app-source inputs, and no real AppProvider, production Supabase client, TallyConnectionCard or useActiveCompany module. Shared cached node_modules are reused. The served local font and logo are byte-identical between release and original checkout. API/router/auth boundaries use temporary synthetic fixtures; external connections remain blocked by both CSP and browser routing.

Passed checks:

- Home, Account, Application Progress and AI at1440×900 and390×844. All checked root/content regions have zero horizontal overflow. Screenshots inspected for layout, legibility and clipping.
- Home has no cloud-Tally card or Tally claim in its content. Its long-business-name mobile state fits. Error state offers Reload workspace.
- Account preserves its two-column desktop layout and stacked mobile layout. Tally is described as a Local connector with an Open Tally connector link to `/tally`. No inferred cloud connection badge, cloud-company disclosure or Connect a Tally company control is present. The actual profile picker lists the two synthetic saved businesses, preserves selection handoff and closes with Done. Identity remains session-derived, independently of business owner.
- Progress retains next-step-first presentation and truthful Approved status with three completed steps plus Document not linked when approval lacks a linked certificate.
- AI without provider consent focuses the checkbox and makes zero fixture calls. After consent, a synthetic response renders. At720×450 CSS reflow, its consent/privacy/disclaimer content remains reachable through the320px scroll viewport with859px content.
- Workspace search returns `/tally` and omits unavailable `/tally-local`.

All runs recorded zero page errors, zero failed responses and zero attempted external requests. No real AI prompt, provider operation, auth operation, upload, payment or filing was attempted. The fixtures establish UI behaviour only. The native keyboard, production authentication/provider acceptance and backend behaviour remain outside this limited recheck. Root owns repository lint/typecheck/export and git operations.

Evidence: `qa-release.json`, `metafile-release.json`, `source-checksums-release.json`, and these screenshots under `screenshots/`:

- `release-home-desktop.png`, `release-home-mobile.png`, `release-home-long-mobile.png`
- `release-account-desktop.png`, `release-account-mobile.png`
- `release-application-details-desktop.png`, `release-application-details-mobile.png`, `release-application-approved-unlinked.png`
- `release-ai-desktop.png`, `release-ai-mobile.png`, `release-ai-reflow-consent.png`

To rebuild this release preview, run `node /private/tmp/registerbox-workspace-ui-qa/build-release.mjs`; then refresh the browser. The original harness build remains available separately as `build.mjs`. Do not ship this temporary harness or its fixture modules.
