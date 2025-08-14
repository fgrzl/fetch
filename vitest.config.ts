/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // use global `describe`, `it`, `expect`
    environment: 'jsdom', // needed for browser APIs like document.cookie
    include: ['test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'], // Only include source files
      exclude: [
        // Standard vitest excludes
        'coverage/**',
        'dist/**',
        'packages/*/test{,s}/**',
        '**/*.d.ts',
        '**/*{.,-}test.{ts,js,mjs,cjs,jsx,tsx}',
        '**/*{.,-}spec.{ts,js,mjs,cjs,jsx,tsx}',
        '**/__tests__/**',
        // Custom excludes for this project
        '**/types.ts', // Type-only files
        'example-*.ts', // Documentation examples
        '*.config.ts', // Configuration files
      ],
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
  },
});
