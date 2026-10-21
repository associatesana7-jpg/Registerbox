# GST walkthrough revision

User rejected the services montage and Kokoro narration. Stop that export. Preserve existing outputs for reference.

New direction: show the actual customer journey in RegisterBox, using captured app screens and interactions rather than service cards or generic typography. Keep the requested 30-second runtime and Hinglish, subject to a new voice sample being acceptable.

Confirmed by the user: GST registration—business details, documents, review, send to RegisterBox. Do not switch to GST return filing.

Verified GST registration preparation from `src/app/onboarding/application.tsx` and `src/data/application-categories.ts`:

1. Choose GST registration and sign in.
2. Enter the business name.
3. Complete the business address.
4. Describe the business activity.
5. Enter contact mobile and email.
6. Choose owned or rented premises.
7. Upload the conditional document checklist.
8. Review answers and documents.
9. Submit to RegisterBox for team review.
10. Show case reference / view applications. This is not a government submission.

Capture blocker: the local app at http://localhost:8081 requires an authenticated user. No authenticated RegisterBox tab was available. Do not bypass sign-in or create production cases merely to capture footage. Use a user-authorized demo account or supplied screen recording.

Resolved: the user signed in and authorized continuing. Actual GST registration screens were captured at localhost:8084 using a draft named “RegisterBox Demo — Video Only.” No identity documents were uploaded and no application was submitted. The final edit is a 28-second vertical walkthrough in `gst-flow-composition/`, with the approved voice. Captures are in `gst-flow-captures/`.

Voice correction: do not reuse Kokoro hf_alpha or af_heart. The user approved the Hindi neural sample, hi-IN-SwaraNeural at -4% speed. The full narration is now `gst-flow-voiceover.mp3` (26.28 seconds), with text and SRT beside it. Target video runtime: 28 seconds, within the user's revised “20 seconds or more” request.

2026-10-15: the dev app continued showing unknown Metro module errors. A clean production web export succeeded at `gst-site-preview/`, served locally at http://localhost:8084 for capture. It uses the real app, with no source changes or sign-in bypass. Authentication is still required before recording the protected flow.
