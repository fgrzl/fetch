import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

/**
 * Library build configuration that mirrors the previous tsup outputs:
 * - ESM (unminified + minified)
 * - CJS (unminified + minified)
 * - Generates TypeScript declarations into `dist/index.d.ts`
 */
export default defineConfig([
  // ESM - unminified (with types)
  {
    build: {
      lib: {
        entry: 'src/index.ts',
        formats: ['es'],
        fileName: () => 'index.js',
      },
      outDir: 'dist',
      sourcemap: true,
      minify: false,
      target: 'es2020',
      rollupOptions: {
        // keep externalization minimal so consumers bundle as they want
      },
    },
    plugins: [
      dts({
        outputDir: 'dist',
        insertTypesEntry: true,
      }),
    ],
  },

  // ESM - minified
  {
    build: {
      lib: {
        entry: 'src/index.ts',
        formats: ['es'],
        fileName: () => 'index.min.js',
      },
      outDir: 'dist',
      sourcemap: true,
      minify: 'terser',
      target: 'es2020',
      rollupOptions: {},
    },
  },

  // CJS - unminified
  {
    build: {
      lib: {
        entry: 'src/index.ts',
        formats: ['cjs'],
        fileName: () => 'cjs/index.js',
      },
      outDir: 'dist',
      sourcemap: true,
      minify: false,
      target: 'es2020',
      rollupOptions: {
        output: {
          exports: 'named',
        },
      },
    },
  },

  // CJS - minified
  {
    build: {
      lib: {
        entry: 'src/index.ts',
        formats: ['cjs'],
        fileName: () => 'cjs/index.min.js',
      },
      outDir: 'dist',
      sourcemap: true,
      minify: 'terser',
      target: 'es2020',
      rollupOptions: {
        output: {
          exports: 'named',
        },
      },
    },
  },
]);
