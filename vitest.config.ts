/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true, // use global `describe`, `it`, `expect`
    environment: "node", // good for libraries and non-DOM projects
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
