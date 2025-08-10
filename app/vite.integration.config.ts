/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"
import { configDefaults } from "vitest/config"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  process.env = {
    ...process.env,
    ...env,
    NODE_ENV: mode as "test" | "development" | "production",
  }
  return {
    plugins: [tsconfigPaths()],
    test: {
      include: ["**/*.spec.test.ts"],
      exclude: [...configDefaults.exclude, "**/e2e/**"],
      environment: "node",
      globals: true,
      setupFiles: ["./src/test-setup.ts"],
      testTimeout: 120000,
      coverage: {
        provider: "v8",
        reporter: ["text", "html"],
        reportsDirectory: "coverage-integration",
        include: ["src/core/**/*.{ts,js}"],
        exclude: ["node_modules/"],
        all: true,
      },
    },
  }
})
