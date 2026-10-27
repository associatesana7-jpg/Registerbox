// The self-contained browser build avoids Metro resolving pdf-lib's nested
// legacy tslib package. Its public exports match the package's typed entry.
declare module 'pdf-lib/dist/pdf-lib.esm.js' {
  export * from 'pdf-lib';
}
