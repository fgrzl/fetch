import { defineConfig } from 'vite-plus';

const libraryEntries = {
  index: 'src/index.ts',
  'middleware/index': 'src/middleware/index.ts',
  'middleware/authentication/index': 'src/middleware/authentication/index.ts',
  'middleware/authorization/index': 'src/middleware/authorization/index.ts',
  'middleware/cache/index': 'src/middleware/cache/index.ts',
  'middleware/csrf/index': 'src/middleware/csrf/index.ts',
  'middleware/logging/index': 'src/middleware/logging/index.ts',
  'middleware/rate-limit/index': 'src/middleware/rate-limit/index.ts',
  'middleware/retry/index': 'src/middleware/retry/index.ts',
  'errors/index': 'src/errors/index.ts',
};

export default defineConfig({
  server: {
    port: 3000,
    open: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    benchmark: {
      include: ['bench/**/*.{bench,benchmark}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'coverage/**',
        'dist/**',
        'bench/**',
        'packages/*/test{,s}/**',
        '**/*.d.ts',
        '**/*{.,-}test.{ts,js,mjs,cjs,jsx,tsx}',
        '**/*{.,-}spec.{ts,js,mjs,cjs,jsx,tsx}',
        '**/__tests__/**',
        '**/types.ts',
        'example-*.ts',
        '*.config.ts',
      ],
      thresholds: {
        branches: 90,
        functions: 95,
        lines: 90,
        statements: 95,
      },
    },
  },
  lint: {
    ignorePatterns: [
      'coverage/**',
      'dist/**',
      'node_modules/**',
      '**/*.d.ts',
      'src/middleware/_template/**',
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      curly: 'error',
      eqeqeq: 'error',
      'no-console': 'warn',
      'no-var': 'error',
      'prefer-const': 'error',
    },
    overrides: [
      {
        files: ['tests/**', 'bench/**'],
        rules: {
          'typescript/no-misused-spread': 'off',
          'typescript/unbound-method': 'off',
        },
      },
    ],
  },
  fmt: {
    ignorePatterns: ['coverage/**', 'dist/**', 'node_modules/**'],
    semi: true,
    singleQuote: true,
    sortPackageJson: false,
  },
  pack: {
    entry: libraryEntries,
    clean: true,
    dts: {
      sourcemap: true,
    },
    format: ['esm', 'cjs'],
    outDir: 'dist',
    outputOptions: {
      exports: 'named',
    },
    platform: 'neutral',
    sourcemap: true,
    target: 'es2020',
    treeshake: true,
  },
});
