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
      exclude: [...configDefaults.exclude, "**/e2e/**", "**/*.spec.test.ts"],
      environment: "node",
      globals: true,
      setupFiles: ["./src/test-setup.ts"],
      testTimeout: 30000, // 30 seconds for complex tests
      pool: "forks",
      coverage: {
        provider: "v8", // 'v8' or 'istanbul'
        reporter: ["text", "html"], // console summary + HTML files
        reportsDirectory: "coverage", // output dir
        include: ["src/core/**/*.{ts,js}"], // your source files
        exclude: ["node_modules/"], // skip deps
        all: true, // include files without any tests
      },
    },
  }
})
