import { defineWorkspace } from "vitest/config"
import { baseConfig } from "./vitest.base"

export default defineWorkspace([
  // 1) Package-local unit tests
  baseConfig({
    test: {
      name: "pkg-unit",
      include: ["packages/*/src/**/*.test.{ts,tsx}"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
      globals: true,
    },
  }),

  // 2) Package-local integration tests
  baseConfig({
    test: {
      name: "pkg-int",
      include: ["packages/*/src/**/*.spec.test.{ts,tsx}"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
      testTimeout: 30000,
      globals: true,
    },
  }),

  // 3) App unit (Node or jsdom when you start UI tests)
  baseConfig({
    test: {
      name: "app-unit",
      include: ["apps/web/src/**/*.test.{ts,tsx}"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
      environment: "node", // switch to 'jsdom' when you start DOM/component tests
      globals: true,
    },
  }),

  // 4) App integration (still Node, longer timeouts)
  baseConfig({
    test: {
      name: "app-int",
      include: ["apps/web/src/**/*.spec.test.{ts,tsx}"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
      testTimeout: 30000,
      globals: true,
    },
  }),

  // 5) Cross-repo integration (real HTTP)
  baseConfig({
    test: {
      name: "xrepo",
      include: ["tests/integration/**/*.test.{ts,tsx}"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
      testTimeout: 45000,
      globals: true,
    },
  }),

  // 6) Deterministic E2E golden
  baseConfig({
    test: {
      name: "e2e",
      include: ["tests/e2e-essential/**/*.test.{ts,tsx}"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
      pool: "threads",
      poolOptions: {
        threads: {
          singleThread: true, // golden runs single-thread for determinism
        },
      },
      testTimeout: 60000,
      globals: true,
    },
  }),
])
