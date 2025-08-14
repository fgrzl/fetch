import { defineConfig } from 'tsup';

export default defineConfig([
  // ESM build (unminified)
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: 'dist',
    target: 'es2020',
    minify: false,
  },
  // ESM build (minified)
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: false, // Types already generated
    sourcemap: true,
    clean: false,
    outDir: 'dist',
    target: 'es2020',
    minify: true,
    outExtension() {
      return {
        js: '.min.js'
      };
    },
  },
  // CJS build (unminified)
  {
    entry: ['src/index.ts'],
    format: ['cjs'],
    dts: false, // Types already generated in ESM build
    sourcemap: true,
    clean: false, // Don't clean, ESM build already did
    outDir: 'dist/cjs',
    target: 'es2020',
    cjsInterop: true,
    minify: false,
    outExtension() {
      return {
        js: '.js' // Force .js extension for CJS files
      };
    },
  },
  // CJS build (minified)
  {
    entry: ['src/index.ts'],
    format: ['cjs'],
    dts: false,
    sourcemap: true,
    clean: false,
    outDir: 'dist/cjs',
    target: 'es2020',
    cjsInterop: true,
    minify: true,
    outExtension() {
      return {
        js: '.min.js'
      };
    },
  }
]);
