import path from "node:path"
import { defineConfig, loadEnv } from "vite"
import { configDefaults } from "vitest/config"

// Single-project Vitest config focused on integration tests only
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  process.env = {
    ...process.env,
    ...env,
    NODE_ENV: mode as "test" | "development" | "production",
  }
  return {
    resolve: {
      alias: {
        "@lucky/shared": path.resolve(__dirname, "./packages/shared/src"),
        "@lucky/core": path.resolve(__dirname, "./packages/core/src"),
        "@lucky/tools": path.resolve(__dirname, "./packages/tools/src"),
        "@lucky/examples": path.resolve(__dirname, "./apps/examples"),
        "@core": path.resolve(__dirname, "./packages/core/src"),
        "@": path.resolve(__dirname, "./apps/web/src"),
        "@tests": path.resolve(__dirname, "./tests"),
      },
    },
    test: {
      // Keep it single-project to avoid “Test Projects” fan-out in editors
      include: ["tests/integration/**/*.test.ts", "tests/integration/**/*.spec.test.ts"],
      exclude: [...configDefaults.exclude, "**/e2e/**"],
      environment: "node",
      globals: true,
      testTimeout: 120000,
      coverage: {
        provider: "v8",
        reporter: ["text", "html"],
        reportsDirectory: "coverage-integration",
        include: ["apps/web/src/**/*.{ts,tsx,js,jsx}"],
        exclude: ["node_modules/"],
        all: true,
      },
    },
  }
})
