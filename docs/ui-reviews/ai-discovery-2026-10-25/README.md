# Answer-led public pages: responsive review

Reviewed 25 October 2026 against the static Expo web export in `/private/tmp/registerbox-answer-led-build`.

## Coverage

- Pages: homepage, service directory, FSSAI, Udyam, GST registration, free nil GST filing, FSSAI home/cloud-kitchen guide and GST document guide.
- Static viewports: 1440×900, 390×844, 360×800 and 720×450 for each page (32 cases).
- Hydrated mobile checks: all eight pages at 390×844.
- Assertions: exactly one H1, direct answer after the H1, visible guidance, visible FAQ/package content, FAQ/schema parity, canonical URL, no viewport overflow, no fixed-action/footer collision, and no failed local resources or browser errors.

## Result

All 32 static cases and all eight hydrated cases passed. The browser recorded no external requests, failed responses, page errors or outstanding layout issues. The final pass also confirmed that animations respect reduced-motion mode.

Two issues found during the first pass were fixed before this result:

- reserved more mobile footer space so fixed service actions do not cover the legal links;
- removed the four-pixel negative mobile margin from article offer cards.

The horizontally scrollable Google-review track is intentional and remains clipped inside its component; the document viewport does not overflow.
