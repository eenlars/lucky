import { resolve } from "node:path"
import { defineConfig } from "vitest/config"

/**
 * Vitest configuration for @lucky/models package
 *
 * Simple config that works standalone or with the root workspace.
 * Tests can be run from package root or monorepo root.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/*.type-test.ts", "src/**/*.spec.test.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@lucky/shared": resolve(__dirname, "../shared/src"),
    },
  },
})
