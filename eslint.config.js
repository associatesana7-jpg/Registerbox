// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // Keep the licensed upstream runtime byte-identical; its checksum is tested.
    ignores: ["dist/*", "src/vendor/sanscript/sanscript.js"],
  }
]);
