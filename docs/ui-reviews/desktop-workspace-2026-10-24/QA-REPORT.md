# Workspace UI QA — isolated synthetic harness

24 October 2026. Local preview: **http://127.0.0.1:4178/dashboard**. Server listens only on loopback and remains available for review (agent exec session 60726).

## Isolation and source fidelity

The harness imports real React DOM, React Native Web, WebShell, CustomerHome, CustomerApplications, CustomerDocuments, Account, Application Details and AI. Bundler resolution explicitly prioritises `.web.tsx`/`.web.ts`. The final metafile confirms actual web shell, Home, Applications, Documents, web primitives and AppIcon are bundled. The real AppProvider and production Supabase client are excluded by build assertions. Data hooks/router/API boundaries resolve to temporary fixtures outside the repository; Service mutations are blocked; Revision 2 also uses local read fixtures and in-memory AI/auth response fixtures. No tokens or credentials are present. Server CSP forbids external connects/forms; automated contexts additionally deny non-loopback requests. All runs reported zero external requests, failed responses and page errors.

Fixture: Sample Kitchen, two applications (one active), three documents, zero open actions, zero drafts, no connected company. Empty/loading/error/long-name states are selectable with a query parameter. In the initial pass, no AI question was submitted. Revision 2 exercises synthetic AI questions and auth responses only within the temporary harness. No live provider call, real authentication operation, service submission, file upload, signed-URL opening, payment or backend write was attempted.

## Verified

- Home screenshots at 1440×900, 1024×768, 390×844 and 360×800. Empty, loading, error and long-business-name states inspected. All 13 general cases have zero horizontal overflow.
- Long business-name issue fixed: narrow Home now measures 390px client width / 390px scroll width, with no out-of-bounds descendant; business name truncates within its own row.
- One page H1 in checked route states. Real committed Material Symbols font loads. Decorative glyphs are removed from the Documents accessibility tree and the search name is exactly “Find a document”.
- Skip-to-workspace is first keyboard stop. Search opens, filters, supports ArrowDown to a result and Ctrl+K; no-results status appears. Escape closes search/navigation and returns focus to their trigger. Mobile menu begins at current page. Nested application-details/GST-returns retain their owner selection.
- Documents: three initial rows; Certificates produces only the issued certificate; Identity only the PAN file; unmatched search gives recoverable empty state; View all restores all three. Request-scoped application link points back to sample-active.
- Upload dialog: initial focus in category select; PAN option works; Tab remains inside; Escape closes and restores Add button. At390px viewport, dialog width354px and internal client/scroll widths352px match. Upload itself remains disabled by harness boundaries and was not attempted.
- Reduced-motion preference: zero running animations and zero nonzero transitions in checked Documents controls.
- 200%-equivalent reflow tested as a720×450 CSS viewport at2× density, producing1440×900 screenshots. Home and Documents retain matching client/scroll widths720px. This is a geometry-equivalent reflow test, not an OS/browser zoom interaction.
- Actual AI composer at390×844: input bottom762px, Send bottom760px, footer bottom778px, navigation top778px. Input stays visible without covering navigation; empty Send disabled, typing enables it. No question was submitted in this initial composer pass; see Revision 2 for synthetic-provider boundary tests. Physical mobile keyboard behaviour remains outside this browser-only check.

## Evidence

- `screenshots/home-desktop.png`, `home-tablet.png`, `home-mobile.png`, `home-mobile-small.png`
- `screenshots/home-empty.png`, `home-loading.png`, `home-error.png`, `home-long-mobile-business.png`
- `screenshots/applications-desktop.png`, `documents-desktop.png`, `documents-mobile.png`, `account-desktop.png`, `application-details-desktop.png`
- `screenshots/mobile-menu.png`, `documents-dialog-desktop.png`, `documents-dialog-mobile.png`
- `screenshots/home-200percent-equivalent.png`, `documents-200percent-equivalent.png`
- `screenshots/ai-mobile.png`, `ai-desktop.png`
- Raw results: `qa-results.json`, `qa-additional.json`, `qa-documents.json`, `qa-ai.json`; source hashes: `source-checksums.json`.

## Reproduce / review

Rebuild current app source with `node /private/tmp/registerbox-workspace-ui-qa/build.mjs`, then refresh the preview. This does not alter repository files. Scripts `verify.mjs`, `verify-additional.mjs`, `verify-documents.mjs` and `verify-ai.mjs` run dedicated headless Chrome profiles against the loopback server. Do not ship this temporary harness or introduce its fixtures into application routes. Browser checks do not verify real authentication, provider behaviour, payment or filing acceptance, native keyboard behaviour, or complete accessibility conformance.

## Final limited recheck

After the final Home error-state and Applications button refinements, the harness was rebuilt again with all web variants. Home error state shows **Reload workspace**, with zero inferred Explore services / GST / application next-step actions. Error-state content client/scroll widths both1208px at1440×900. Applications desktop **View progress** is one line (`white-space:nowrap`) in a144×44px button. At360×800, Applications content and root both measure360px client/scroll width with no horizontal overflow. Inspected refreshed `home-error.png`, `applications-desktop.png` and new `applications-mobile-360.png`; no clipping or overlapping action text. No page errors or external requests. Raw final evidence: `qa-final-small.json`. Earlier test results remain preserved; only affected screenshots were refreshed.


## Revision 2 — Application Progress, AI and Account

The final harness imports the explicit new `.web` routes and the real `application-progress.web.tsx`, `ai-workspace.web.tsx` and `account-workspace.web.tsx` implementations. The esbuild metafile verifies all three alongside their real CSS and shared shell/primitives. Actual ApplicationPaymentCard and TallyConnectionCard are retained; payment status reads use a synthetic paid-record fixture. The real AppProvider and production Supabase client remain excluded. No shipping fixture routes or application files were added by QA.

Verified after the final source rebuild:

- Desktop 1440×900, mobile390×844 and360×800: no horizontal overflow on all three pages. Progress uses a primary column and record rail; Account uses settings and connected-tools columns; AI has a centred conversation and anchored composer. Screenshots were inspected for text size, spacing, clipping and primary-action visibility. Progress’s44px Review documents button is fully visible at y312–356 on desktop and stacks correctly on mobile.
- Progress: in-review, approved with linked certificate, approved without linked certificate, action-required, unknown provider status, not-found, loading and error. Linked approval has four completed stages; unlinked approval has three completed stages and a current certificate stage explicitly marked Document not linked. Unknown status does not infer completion; missing government date stays No date recorded. Application documents preserves the request-scoped application id.
- Account: long business names, multiple saved profiles, no business, connected/disconnected/attention, connection loading/error and companies without an active company. The actual custom profile selector lists both synthetic businesses and closes through Done. Tally’s disclosure opens its real profile details. Signed-in identity uses the session name Sample Workspace Member, independently of business owner Sample Owner; mobile email remains on one line. Synthetic sign-out returns to /auth on success, keeps Account plus error on failure, passes no options to signOut, and is hidden in demo mode.
- AI: a suggestion without Groq consent preserves the question, focuses the consent checkbox, and makes zero fixture API calls. Enter submits only after consent; Shift+Enter adds a newline and IME composing Enter makes no call. Synthetic answer, loading, error and action responses render correctly. An empty answer with three valid actions plus missing facts still renders its response article. Error restores the question for retry; loading disables Send. Action routing reaches the expected GST-return destination in the local router.
- Native nil-return guidance opens without an AI-provider call and its close control works. Platform/POS and TCS actions reach clearly labelled QA workflow guards. Upload reaches the temporary boundary error rather than a picker or external service. Expensive provider workflows are excluded from the harness, so these checks establish UI handoff only.
- Keyboard: Skip to workspace is the first Tab stop on all three routes and moves focus to main. Decorative private-use icon glyphs are absent from their accessibility names. Reduced-motion checks report zero running animations and zero nonzero AI transitions.
- Reflow at720×450 CSS: an initial issue collapsed AI’s conversation to0px. The implemented short-height scrolling fix now provides a320px viewport with859px content, a467px conversation, and reachable consent/privacy/disclaimer content; when scrolled down the disclaimer sits y350–367 inside main y64–384. No horizontal overflow. This is a geometry-equivalent 200% reflow check, not an OS/browser zoom action. At390×844, AI disclaimer ends y768 and bottom navigation begins y778; all four suggestions are reachable through its conversation scroll.

All final browser runs reported zero page errors and zero attempted external requests. Requests were restricted to the loopback preview and the server CSP disallows external connections. Synthetic prompt calls are recorded only in memory inside the harness. No real prompt was sent to Groq or any provider. Physical mobile keyboards, production authentication, real payment/provider acceptance, document uploads and filing outcomes remain outside this UI QA.

Durable final evidence uses the `revision2-` prefix in this folder:

- `revision2-application-details-desktop.png`, `revision2-application-details-mobile.png`
- `revision2-account-desktop.png`, `revision2-account-mobile.png`, `revision2-account-long.png`, `revision2-account-attention.png`, `revision2-account-tally-details.png`
- `revision2-ai-desktop.png`, `revision2-ai-mobile.png`, `revision2-ai-consent-required.png`, `revision2-ai-answer.png`, `revision2-ai-error.png`, `revision2-ai-loading.png`, `revision2-ai-actions.png`, `revision2-ai-empty-answer-actions.png`
- `revision2-ai-reflow-720.png`, `revision2-ai-reflow-720-consent.png`, plus detail/account reflow and progress action/unknown/unlinked-approval state screenshots.
- Raw results: `qa-three-pages.json`, `qa-three-interactions.json`, `qa-revision2-final.json`. Current bundled source hashes: `source-checksums-revision2.json`. Earlier evidence remains preserved.

Final limited refresh: the Account management trigger now measures754px across its desktop card (RNWeb emits BUTTON), and both Account desktop/mobile captures were refreshed. Progress state tags compute to11px on desktop and mobile; the unlinked-certificate capture now shows the actual Approved badge alongside3/4 complete and Document not linked. Progress desktop/mobile and unlinked captures were refreshed after the last source rebuild. All four checked layouts retain zero horizontal overflow; zero page errors/external requests. Evidence: `qa-revision2-limited.json`. Source hashes were refreshed with this build.
