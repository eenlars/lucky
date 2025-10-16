import { defineWorkspace } from "vitest/config"
import { baseConfig } from "./vitest.base"

export default defineWorkspace([
  // 1) Package-local unit tests
  baseConfig({
    test: {
      name: "pkg-unit",
      include: ["packages/*/src/**/*.test.{ts,tsx}"],
    },
  }),

  // 2) Package-local integration tests
  baseConfig({
    test: {
      name: "pkg-int",
      include: ["packages/*/src/**/*.spec.test.{ts,tsx}"],
      testTimeout: 30000,
    },
  }),

  // 3) App unit (Node or jsdom when you start UI tests)
  baseConfig({
    test: {
      name: "app-unit",
      include: ["apps/web/src/**/*.test.{ts,tsx}"],
      environment: "node", // switch to 'jsdom' when you start DOM/component tests
    },
  }),

  // 4) App integration (still Node, longer timeouts)
  baseConfig({
    test: {
      name: "app-int",
      include: ["apps/web/src/**/*.spec.test.{ts,tsx}"],
      testTimeout: 30000,
    },
  }),

  // 5) Cross-repo integration (real HTTP)
  baseConfig({
    test: {
      name: "xrepo",
      include: ["tests/integration/**/*.test.{ts,tsx}"],
      testTimeout: 45000,
    },
  }),

  // 6) Deterministic E2E golden
  baseConfig({
    test: {
      name: "e2e",
      include: ["tests/e2e-essential/**/*.test.{ts,tsx}"],
      pool: "threads",
      poolOptions: {
        threads: {
          singleThread: true, // golden runs single-thread for determinism
        },
      },
      testTimeout: 60000,
    },
  }),
])
