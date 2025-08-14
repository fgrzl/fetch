import { defineConfig } from 'tsup';

export default defineConfig([
  // ESM build
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: 'dist',
    target: 'es2020',
  },
  // CJS build
  {
    entry: ['src/index.ts'],
    format: ['cjs'],
    dts: false, // Types already generated in ESM build
    sourcemap: true,
    clean: false, // Don't clean, ESM build already did
    outDir: 'dist/cjs',
    target: 'es2020',
    cjsInterop: true,
    outExtension() {
      return {
        js: '.js' // Force .js extension for CJS files
      };
    },
  }
]);
