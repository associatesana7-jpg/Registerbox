# RegisterBox — Nil, made simple

32 seconds · 1080 × 1920 · 30 fps. Open **RegisterBox-Nil-Return** in Studio. Every scene has its own editable timeline; narration and music are separate local tracks.

Start the preview with `npm run dev` in this folder.

## Editing

- `creative-brief.md`: story, timings, source boundaries, and visual direction.
- `src/Composition.tsx`: parent timeline, audio cues, and scene registrations.
- `src/scenes/`: opening, period, review, authorization, verification, and closing.
- `src/components.tsx` and `src/theme.ts`: shared UI and motion tokens.
- `scripts/create-audio.cjs`: reproducible Mac narration and original synthesized score.

Narration uses the locally installed macOS Rishi voice. The music is an original instrumental with no sampled commercial recording. The final logo comes from the app's existing assets.

The UI is reconstructed and condensed for readability. PAN and OTP are demonstration placeholders. The recording ends at the OTP screen, so the film does not claim a completed filing or invent an ARN.

## Verification

Video lint and TypeScript pass, as do the parent Expo app checks. Key frames were inspected in Studio and rendered as stills in `out/`. The 32-second mix measures approximately −17.5 LUFS integrated and −4.4 dBTP peak; every narration clip fits inside its scene.

## Export

Use Studio's Render control, or:

```sh
npx remotion render src/index.ts RegisterBox-Nil-Return out/registerbox-nil-return.mp4
```
