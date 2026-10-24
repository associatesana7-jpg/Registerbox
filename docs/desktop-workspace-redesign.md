# Desktop workspace redesign — 24 October 2026

Implemented a desktop-first customer workspace while retaining the mobile and native journeys. This is a local source change; production publishing is pending.

## What changed

- Compact 64px toolbar, 232px grouped sidebar, consistent system typography, neutral surfaces and restrained blue actions. Real account/support links and route-aware selection include application details, GST returns, purchases, document integrations and Tally.
- Keyboard navigation search opens with Cmd/Ctrl+K. Search and mobile navigation use native modal dialogs with focus containment, Escape dismissal and focus restoration. A skip link reaches the main workspace.
- Home now uses a responsive overview grid with real record counts, a contextual next step, recent applications, business selection and supporting workspaces. Failed record loads show recovery rather than an inferred next action.
- Applications uses compact rows, actual filter counts and separate saved-draft/attention grids. The journey explanation is disclosed on demand.
- Documents uses a searchable library, verification status, private file actions and an accessible upload dialog. Existing categories, business/session remounting, application return links and 60-second signed downloads remain intact.
- Application Progress now has a service-specific header, an immediately visible next action, a vertical journey and a separate application-record rail. Approved applications without a linked certificate distinguish approval from document availability. Draft, closed, unknown, loading and unavailable records have explicit states. The existing payment component and application-scoped document routes remain intact.
- RegisterBox AI now has a focused conversation area, four compact starting points, a multiline composer and compact bill/GST tools. Groq permission and redaction details remain visible. Short windows use one scrolling page so neither the conversation nor consent controls become inaccessible. Real workflow actions, bill review, business isolation and approval steps remain intact; empty answer text does not hide valid action buttons.
- Account now groups the signed-in identity, business details, privacy links and session controls, with a separate connected-tools/support rail. Identity comes from the signed-in user rather than the business owner's name. Business management remains available. The release links to the existing local Tally connector; the separate unfinished cloud-company integration stays outside this UI change.
- Shared web headings, cards, controls, loading states and screen/footer layout give other customer workspace pages the same visual system. External forms retain their narrower widths. Native component implementations remain unchanged, apart from a small long-business-name flex constraint in the shared picker.
- Decorative web symbol glyphs are hidden from assistive technology. Focus is visible, control targets are at least 44px where used for touch, and reduced-motion preferences disable nonessential transitions and animations.

No dependencies were added. Account guards, customer scope, consent, filing approval, backend and payment behavior were preserved. Existing navigation-test fixtures were updated for the existing ActiveCompanyProvider and the shell stylesheet import.

## Verification

- `npm run lint`: passed.
- Expo SDK 57 static web export: passed, output `/private/tmp/registerbox-desktop-web-build`.
- Existing workspace, account, navigation, privacy-access and GST screen/period/payment regression scripts: passed. The detail-screen pass ran seven relevant scripts with 15 passing tests. They do not make live filing or payment calls.
- Full `tsc --noEmit`: passed in the clean release checkout based on `origin/main` (`7945a68`). The original mixed working folder still has unrelated copied-output/blog errors; they are not included in this release.
- Isolated browser QA imports the actual web components with read-only synthetic hook fixtures. Real AppProvider/Supabase are excluded; no auth bypass, production route, token copying or production writes were added.
- Verified 1440×900 desktop, 1024×768 tablet, 390×844 and 360×800 mobile, empty/loading/error/long-name states, nested navigation, command search, keyboard focus, document filtering and modal dismissal. A 720×450 CSS viewport at 2× pixel density checks 200%-equivalent reflow; this is not an OS-level zoom test.
- The three detail screens were checked at 1440×900 desktop, 390×844 mobile and 720×450 reflow, including status, identity, connection and AI response/error states. AI composer controls remain above mobile navigation; short windows can scroll to both the conversation and all consent details. Synthetic AI responses and session operations were tested only against isolated fixture boundaries; no live provider, filing or payment calls were made.

QA harness: `http://127.0.0.1:4178/dashboard` (sample records). Durable report and selected screenshots are saved in `docs/ui-reviews/desktop-workspace-2026-10-24/`; the temporary harness remains at `/private/tmp/registerbox-workspace-ui-qa/`. The actual local app is served separately by Expo on port 8092 and retains its normal sign-in requirement. Browser checks do not establish live provider acceptance or physical-device keyboard behavior.

## Design references

Apple's [Layout](https://developer.apple.com/design/human-interface-guidelines/layout), [Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars), [Motion](https://developer.apple.com/design/human-interface-guidelines/motion) and [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) guidance informed the hierarchy, adaptable navigation and restrained motion. The implementation is RegisterBox's own web UI; it does not reproduce Apple branding or claim Apple certification.

## Git release scope

Prepared on current `origin/main` rather than the older mixed working branch. Existing payment, analytics, regional public-blog routes and compact registration forms are retained. The shared business picker takes only the two long-name layout constraints. Unfinished Tally cloud integration, connector/binary/video work and unrelated local edits are excluded. Home does not expose the unfinished cloud card; Account links to the existing local connector without inventing its connection status.

Release checks: lint, full typecheck and all 15 tests in seven relevant regression scripts passed. The source export and limited desktop/mobile/reflow checks are recorded in the release review report. This Git push does not publish the website.
