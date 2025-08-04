/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // use global `describe`, `it`, `expect`
    environment: 'jsdom', // needed for browser APIs like document.cookie
    coverage: {
      reporter: ['text', 'html'],
      threshold: {
        global: {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
      },
    },
  },
});
