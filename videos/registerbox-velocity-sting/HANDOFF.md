# RegisterBox velocity sting

12 seconds · 1080 × 1080 · 30 fps · silent.

Delivery: renders/registerbox-velocity-sting.mp4 (H.264, 360 frames, 1,722,506 bytes). The encoded file was probed and decoded-frame reviewed after rendering.

Sound delivery: renders/registerbox-velocity-sting-with-sound.mp4 (H.264 + stereo AAC, 48 kHz, 360 frames, 2,024,737 bytes). Integrated mix level is -21.3 LUFS with a -6.2 dBFS true peak. The original local synth bed is reproducible with scripts/generate-registerbox-bed.mjs; resolved sound assets and provenance are recorded under .media/.

## Story

Seven scenes: brand lockup, sign-in, email entry, illustrative GST readiness count, app navigation, guided registration action, final brand lockup. The readiness percentage is demo data, not a live customer result.

## Brand and source

Local RegisterBox app icon and app-derived labels. Ground #F5F9FF, ink #0A1943, accent #0865F7, line #E0E9F7. System font stack. Asset provenance is in assets/index.md.

## Verification

Latest check: 0 errors, warnings, or informational findings across lint, runtime, layout, motion, and contrast; 43/43 contrast checks passed. Inspected story frames: 0.6, 1.9, 3.2, 4.8, 6.5, 9.7, 11.2 seconds. Inspected both sides of all six cuts at 1.3, 2.6, 4.1, 5.6, 7.5, 10.7 seconds. Cursor path inspected with an onion-skin trace.

Story contact sheet: .hyperframes/artifacts/snapshots/4760d13f-0c77-4b1a-a41f-b5375d89ca71/contact-sheet.jpg

Seam proof sheets: .hyperframes/artifacts/snapshots/6dbd6e04-645d-44ee-b452-b63e29adf654/contact-sheet-1.jpg and contact-sheet-2.jpg

## Editing

Source: index.html. Motion assertions: index.motion.json. Seam contract: ledger.json. Shot plan: shot-plan.json.

Studio: http://localhost:3005/#project/registerbox-velocity-sting

Navigation offsets currently authored as Home 196px, AI 128px, Compliance 274px, Documents 302px, Account 222px; highlight width 464px. These are authored values visually checked in the settled frame, not separately measured text widths. Re-measure after a font or label change.
