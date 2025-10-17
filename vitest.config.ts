import { loadEnv } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"
/**
 * Root Vitest config with multi-project workspace
 */
import { defineConfig } from "vitest/config"

const sharedPlugins = [tsconfigPaths({ projects: ["./tsconfig.paths.json"] })]
const env = loadEnv("test", process.cwd(), "")
const baseTestOptions = {
  globals: true,
  setupFiles: ["./packages/test-config/src/setup.global.ts"],
  env,
}

export default defineConfig({
  plugins: sharedPlugins,
  test: {
    ...baseTestOptions,
    projects: [
      {
        plugins: sharedPlugins,
        test: {
          ...baseTestOptions,
          name: "pkg-unit",
          include: ["packages/*/src/**/*.test.{ts,tsx}"],
          exclude: ["packages/*/src/**/*.spec.test.{ts,tsx}"],
          setupFiles: ["./packages/core/test/setup.unit.ts"],
        },
      },
      {
        plugins: sharedPlugins,
        test: {
          ...baseTestOptions,
          name: "pkg-int",
          include: ["packages/*/src/**/*.spec.test.{ts,tsx}"],
          testTimeout: 30000,
        },
      },
      {
        plugins: sharedPlugins,
        test: {
          ...baseTestOptions,
          name: "app-unit",
          include: ["apps/web/src/**/*.test.{ts,tsx}"],
          exclude: ["apps/web/src/**/*.spec.test.{ts,tsx}"],
          environment: "node",
        },
      },
      {
        plugins: sharedPlugins,
        test: {
          ...baseTestOptions,
          name: "app-int",
          include: ["apps/web/src/**/*.spec.test.{ts,tsx}"],
          testTimeout: 30000,
        },
      },
      {
        plugins: sharedPlugins,
        test: {
          ...baseTestOptions,
          name: "xrepo",
          include: ["tests/integration/**/*.test.{ts,tsx}"],
          testTimeout: 45000,
        },
      },
      {
        plugins: sharedPlugins,
        test: {
          ...baseTestOptions,
          name: "e2e",
          include: ["tests/e2e-essential/**/*.test.{ts,tsx}"],
          pool: "threads",
          poolOptions: {
            threads: {
              singleThread: true,
            },
          },
          testTimeout: 60000,
        },
      },
    ],
  },
})
