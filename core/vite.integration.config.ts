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
    resolve: {
      alias: {
        "@core": new URL("./src", import.meta.url).pathname,
        "@runtime": new URL("../runtime", import.meta.url).pathname,
        "@shared": new URL("../shared/src", import.meta.url).pathname,
      },
    },
    test: {
      include: ["**/*.integration.test.ts"],
      exclude: [...configDefaults.exclude, "**/e2e/**"],
      environment: "node",
      globals: true,
      setupFiles: ["./src/__tests__/test-setup.ts"],
      testTimeout: 120000,
      coverage: {
        provider: "v8",
        reporter: ["text", "html"],
        reportsDirectory: "coverage-integration",
        include: ["src/**/*.{ts,js}"],
        exclude: ["node_modules/"],
        all: true,
      },
    },
  }
})
