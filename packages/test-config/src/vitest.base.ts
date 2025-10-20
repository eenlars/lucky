import { configDefaults, defineConfig, mergeConfig } from "vitest/config"
import { tsPathsFor } from "./plugins"

export function baseConfig(overrides: Parameters<typeof defineConfig>[0] = {}) {
  const baseSettings = defineConfig({
    plugins: [
      // Read both root paths and app tsconfig for "@/*"
      tsPathsFor("./tsconfig.paths.json", "./apps/web/tsconfig.json"),
    ],
    test: {
      environment: "node",
      isolate: true,
      restoreMocks: true,
      clearMocks: true,
      mockReset: true,

      // Coverage: V8 only, consistent directory name
      coverage: {
        provider: "v8",
        reportsDirectory: "coverage",
        reporter: ["text", "html", "lcov", "json"],
        exclude: [...configDefaults.coverage.exclude, "**/__tests__/**", "**/*.stories.*", "tests/**", "scripts/**"],
      },

      // Stability + performance
      pool: "threads",
      fileParallelism: true,
      // In CI, keep workers modest to reduce flake on shared runners
      maxWorkers: process.env.CI ? 4 : undefined,
      minWorkers: 1,
      sequence: { shuffle: false },
      testTimeout: 15000,

      // Determinism helpers
      setupFiles: ["./packages/test-config/src/setup.global.ts"],

      // Avoid brittle watch in CI
      watch: !process.env.CI,
    },
  })

  return mergeConfig(baseSettings, overrides)
}
