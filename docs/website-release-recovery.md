# Website release recovery — 22 October 2026

The regional/blog release was based on remote main at `6dd06d3`, while newer local non-Tally work was on `codex/publish-non-tally-updates` at `afd0c95`. Both diverged after `3ced0be`. The new remote release therefore omitted the local clients, reviews, map/footer and sign-in dialog updates; those files were recoverable locally.

This recovery combines the current remote blog/language release with the saved non-Tally source updates. It retains the readable guide titles and clickable guide images. Unrelated local Tally edits and generated video/store media are not published or modified.

Advertised RegisterBox service amounts and the LocalBusiness price range are removed from the public website. Educational statutory amounts in blog guides and existing private financial records are not sales prices and remain unchanged. No database migration, tax filing or live authentication action is executed by this release.

Run before release:

- Expo lint and TypeScript typecheck.
- `node scripts/prepare-blog-build.mjs` then Expo static web export.
- Existing blog, regional, service, analytics, access and public-link checks.
- `node scripts/check-website-recovery.mjs <export-directory>`.

Future website changes must begin from the latest published main and account for saved local release branches before deploying. Do not replace the dirty primary checkout; it contains separately owned Tally work.
