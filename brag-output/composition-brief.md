# Hyperframes Composition Brief: RegisterBox

## Objective
Create a polished 20-second launch-style brag video for RegisterBox with warm, natural narration.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 20 seconds

## Source Material
- Project root: `/Users/bhavnaosthwal/Desktop/registerbox`
- Primary files read: `README.md`, `src/components/website/content.ts`, `src/components/website/landing.web.tsx`, `src/components/website/website.css`, `src/constants/design.ts`, mobile routes, and Play Store screenshot documentation
- Product name: RegisterBox
- Tagline / strongest claim: Built for the way India does business.
- Key UI or visual moment to recreate: the real home -> application -> AI -> document-wallet flow
- Copy that must appear verbatim:
  - Big ambitions. Less paperwork.
  - Built for the way India does business.
  - Practical AI guidance.

## Creative Direction
- Tone preset: app-store
- Creative direction: confident Indian business companion; polished, clear, and practical
- Interpretation: Smooth feature-led pacing, genuine UI, restrained brand motion, and no exaggerated claims.
- Angle: Big ambitions should not create bigger paperwork; RegisterBox keeps the next steps connected.
- Hook: Big ambitions. Less paperwork.
- Outro / punchline: RegisterBox. Built for the way India does business.
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Invented government-filing or verification claims
  - Any real customer data

## Visual Identity
- Background: #071946
- Text: #FFFFFF and #0A1943
- Accent: #0865F7 with #FFB627 as the small star accent
- Display font: Archivo Black
- Body font: Space Mono
- Visual references from the project: cobalt/navy campaign field, pale ice cards, electric blue controls, yellow star, rounded mobile UI, real 1080x1920 Play Store screenshots

## Storyboard
Use `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. Big ambitions — 3.5s — hook plus real home screen
2. Choose and prepare — 4.5s — home and application screens advance
3. Practical guidance — 4.5s — real AI workspace in focus
4. Everything connected — 4.5s — real Document Wallet in focus
5. Brand close — 3s — RegisterBox wordmark and tagline

## Audio
- Audio role: warm, polished product bed led by a natural voice
- Audio arc: voice begins immediately; music remains supportive through the product flow and opens slightly at the brand close
- Music: `happy-beats-business-moves-vol-1-by-ende-dot-app.mp3`
- Music treatment: low volume under narration, voiceover carve, slight lift after final spoken line, short end fade
- Music cue guidance: bundled preset at `/Users/bhavnaosthwal/.codex/skills/brag/assets/music/cues/happy-beats-business-moves-vol-1-by-ende-dot-app.music-cues.json`; use the 3.02-6.03s beat grid for screen advances and the 17.02s strong cue for the logo
- Audio-reactive treatment: subtle blue glow/depth breathing only; no visualizer graphics
- Audio-coupled moments:
  - Hook/device settle — beat-aligned reveal
  - Application screen — soft click
  - AI screen — soft selection click
  - Document cards — two restrained arrivals
  - Brand close — warm impact at 17.02s
- SFX selection guidance: favor low-risk `interface/click_003.ogg` and `impact/impactSoft_medium_001.ogg`; one medium-risk bell only if the final logo needs it
- SFX analysis guidance: `/Users/bhavnaosthwal/.codex/skills/brag/assets/sfx/sfx-analysis.md`
- Exact SFX choice: use the planned local files and keep them sparse.
- Audio files: copy music, selected SFX, and generated narration into `brag-output/composition/assets/`
- Voice: Kokoro `af_heart`, natural pace; conversational, warm, not an announcer

## Hyperframes Instructions
Use current Hyperframes core, animation, creative, keyframes, audio and CLI contracts. Keep the composition monolithic unless a registry component clearly reduces risk. Use CSS push transitions between product beats and a soft blur crossfade into the final lockup.

Requirements:
- Show the actual RegisterBox screenshots from `store-assets/2026-10/screenshots/`.
- Keep all text readable in the final render.
- Keep the video exactly 20 seconds.
- Include the planned music, SFX, and natural narration.
- Carve the music under the voiceover.
- Keep all assets local to the composition.
- Run `hyperframes check` before render.
- Keep creation and rendering local.
