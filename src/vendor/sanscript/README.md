# Sanscript 1.3.3 runtime

This directory vendors the exact published JavaScript runtime, TypeScript
declaration and MIT license from `@indic-transliteration/sanscript@1.3.3`.
The original files are unchanged.

Upstream: https://github.com/indic-transliteration/sanscript.js

Package archive:
https://registry.npmjs.org/@indic-transliteration/sanscript/-/sanscript-1.3.3.tgz

Registry archive integrity:
`sha512-zNGeARmQTPIlubwgEhl/JumpwTPHrdT/cNsQeCL+G67SQmjJe3qRnMIYghXiVt7+KDso/pU1Ky2ZfD/RBISfJQ==`

SHA-256 checksums:

```text
6dca053574abfb840823a2b014341468b7e247416d0e7754b6a49f76d24d0def  sanscript.js
21135a12c7fb20f8a002b97f42c7eecd354137c9b8b4bf2b8b1ed1b1b0fcb748  LICENSE
d90841c400d1a3e767a0ad632ec81e023c4706808c3e2d1a224a027c781eb4f9  sanscript.d.ts
```

The generated runtime includes its script maps. It does not load TOML, require
other packages, evaluate text as JavaScript, or make network requests. Vendoring
these files avoids installing its unused TOML parser and map-building packages.
RegisterBox's local spelling helpers and script adaptations live separately in
`src/lib/indian-transliteration.ts`.

To reproduce the files, run from the repository root (inspect the printed
archive integrity before extracting):

```sh
npm pack @indic-transliteration/sanscript@1.3.3 --ignore-scripts --pack-destination /tmp
openssl dgst -sha512 -binary /tmp/indic-transliteration-sanscript-1.3.3.tgz | openssl base64 -A
# Expected: zNGeARmQTPIlubwgEhl/JumpwTPHrdT/cNsQeCL+G67SQmjJe3qRnMIYghXiVt7+KDso/pU1Ky2ZfD/RBISfJQ==
tar -xOf /tmp/indic-transliteration-sanscript-1.3.3.tgz package/sanscript.js > src/vendor/sanscript/sanscript.js
tar -xOf /tmp/indic-transliteration-sanscript-1.3.3.tgz package/LICENSE > src/vendor/sanscript/LICENSE
tar -xOf /tmp/indic-transliteration-sanscript-1.3.3.tgz package/types/sanscript.d.ts > src/vendor/sanscript/sanscript.d.ts
shasum -a 256 src/vendor/sanscript/sanscript.js src/vendor/sanscript/LICENSE src/vendor/sanscript/sanscript.d.ts
node --test scripts/test-indian-transliteration.mjs
```

The runtime is excluded from first-party style linting so its upstream bytes
remain intact. The test suite verifies its checksum and exercises all 28
language choices through the actual vendored runtime.
