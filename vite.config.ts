import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

/**
 * Vite config that supports two-step builds via `MIN` env flag:
 * - `MIN=false` : unminified build + types (writes types to `dist/`)
 * - `MIN=true`  : minified build (does NOT clean `dist`)
 *
 * Usage in package.json:
 *  - "build:unmin": "cross-env MIN=false vite build"
 *  - "build:min": "cross-env MIN=true vite build"
 */
export default defineConfig(() => {
  const isMin = process.env.MIN === 'true';

  return {
    build: {
      lib: {
        entry: 'src/index.ts',
        formats: ['es', 'cjs'],
        fileName: (format) => {
          if (format === 'es') return isMin ? 'index.min.js' : 'index.js';
          return isMin ? 'cjs/index.min.js' : 'cjs/index.js';
        },
      },
      outDir: 'dist',
      sourcemap: true,
      minify: isMin ? true : false,
      target: 'es2020',
      // On minified builds, avoid emptying the output dir so types emitted earlier stay.
      emptyOutDir: !isMin,
      rollupOptions: {
        output: {
          exports: 'named',
        },
      },
    },
    plugins: isMin
      ? []
      : [
          dts({
            outputDir: 'dist',
            insertTypesEntry: true,
            skipDiagnostics: true,
            include: ['src/**/*'],
          }),
        ],
  };
});
