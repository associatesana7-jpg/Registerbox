# RegisterBox website navigation audit

Audit date: 16 October 2026
Build checked: local Expo web export in `/tmp/registerbox-navigation-preview`

## Outcome

- 55 exported pages scanned.
- 792 rendered link occurrences checked for valid internal routes, page fragments and non-empty destinations.
- 393 source-level buttons, tiles and other controls classified for a real handler or form purpose.
- No missing internal route, missing fragment, empty destination, `javascript:` link or handler-less button remains in the fresh build.
- 41 unique external destinations probed: 32 responded successfully, four rejected the automated HEAD request (three MCA 403 responses and one CBIC 405 response), and five timed out or could not be verified. No external URL returned a confirmed 404 or 410.

Machine-readable evidence is in `website-navigation.json` and `external-links.json` in this directory.

## Problems found and fixed

1. Legacy application chooser links without a prompt could fall back to the dashboard. They now show an explicit 11-service chooser, and every choice has a distinct destination.
2. Document setup and “Update business details” actions could return to an unrelated screen. They now open the existing-business application flow.
3. Three welcome-page actions previously converged on the same generic path. They now open service choice, AI guidance and document reuse respectively.
4. Homepage service cards implied that they immediately started an application while opening an information page. Their labels now say “View service”; the service page owns the one clear start action.
5. Trademark had no supported application workflow but could lose its enquiry context. It now opens the contact page with Trademark preselected.
6. GST form, filing-period and purchase-period destinations could lose their context across sign-in. The allow-list now preserves only validated form, mode, year and month parameters and rejects malformed or unknown redirect parameters.
7. Privacy and service-information footer links opened the top of the policy page. They now scroll to the named section.
8. The GST return back action depended on browser history. It now goes deterministically to the GST workspace.
9. An unknown application category could silently become a new-business application. The fresh bundle now shows a supported-service chooser instead.
10. Preparation-stage controls were text with pointer handlers. They are now accessible buttons with a visible and machine-readable selected state and a 44 px minimum target.

## Real-browser checks

The following safe interactions were exercised in Chrome against the local build:

- All 12 service cards and their primary actions.
- All seven workspace navigation destinations.
- Mobile menu open/close and Services navigation.
- Service directory category filtering and text search.
- Service-page document disclosure and preparation-stage selector.
- Policy section deep linking.
- Contact-message preparation and clearing after editing; no message was sent.
- Responsive layouts at 390 x 844 and 320 x 568. The 320 px service page had no horizontal overflow, and primary controls remained usable.

Automated navigation tests additionally cover all 11 application/workspace destinations, 24 signed-in/signed-out primary CTAs, authentication return paths, unsafe redirect rejection, the legacy chooser, welcome actions, document setup, profile edits, trademark enquiry context and all 15 local-search page contracts.

## Intentional route aliases

`/dashboard` and the grouped tab home render the same workspace by design. `/certificate` intentionally renders the document wallet, and `/query` is retained as a legacy workspace entry. These are compatibility aliases, not unexplained duplicate clicks.

## Safety boundaries and remaining manual checks

The audit did not submit an application, enter an OTP, upload a document, make a payment, file a GST return, send WhatsApp/email, or post a review. Those final actions require a controlled test account and explicit test data. Admin-only mutations and provider/government flows were classified from source but were not executed.

During the audit, a stale in-memory browser bundle briefly followed its former compliance-check route. It may have refreshed the selected business's RegisterBox compliance scan. It did not submit anything to a government portal, upload a file, send a message or make a payment. The current source and fresh bundle contain the corrected route behavior.

The nine external links that did not return a normal automated response are not labelled broken: the affected government sites commonly block HEAD requests, have TLS/network restrictions or timed out. They should be opened manually before a production release if those providers are business-critical.
