import { loadEnv } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"
/**
 * Root Vitest config with multi-project workspace
 */
import { defineConfig } from "vitest/config"

const sharedPlugins = [tsconfigPaths({ projects: ["./tsconfig.paths.json"] })]
const env = loadEnv("test", process.cwd(), "")

export default defineConfig({
  plugins: sharedPlugins,
  test: {
    globals: true,
    setupFiles: ["./packages/test-config/src/setup.global.ts"],
    env,
    projects: [
      {
        plugins: sharedPlugins,
        test: {
          name: "pkg-unit",
          include: ["packages/*/src/**/*.test.{ts,tsx}"],
        },
      },
      {
        plugins: sharedPlugins,
        test: {
          name: "pkg-int",
          include: ["packages/*/src/**/*.spec.test.{ts,tsx}"],
          testTimeout: 30000,
        },
      },
      {
        plugins: sharedPlugins,
        test: {
          name: "app-unit",
          include: ["apps/web/src/**/*.test.{ts,tsx}"],
          environment: "node",
        },
      },
      {
        plugins: sharedPlugins,
        test: {
          name: "app-int",
          include: ["apps/web/src/**/*.spec.test.{ts,tsx}"],
          testTimeout: 30000,
        },
      },
      {
        plugins: sharedPlugins,
        test: {
          name: "xrepo",
          include: ["tests/integration/**/*.test.{ts,tsx}"],
          testTimeout: 45000,
        },
      },
      {
        plugins: sharedPlugins,
        test: {
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
