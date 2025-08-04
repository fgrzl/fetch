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
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
  },
});
