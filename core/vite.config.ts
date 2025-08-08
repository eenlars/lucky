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
      exclude: [
        ...configDefaults.exclude,
        "**/e2e/**",
        "**/*.integration.test.ts",
      ],
      environment: "node",
      globals: true,
      setupFiles: ["./src/__tests__/test-setup.ts"],
      testTimeout: 30000, // 30 seconds for complex tests
      pool: "forks",
      coverage: {
        provider: "v8", // 'v8' or 'istanbul'
        reporter: ["text", "html"], // console summary + HTML files
        reportsDirectory: "coverage", // output dir
        include: ["src/**/*.{ts,js}"], // your source files
        exclude: ["node_modules/"], // skip deps
        all: true, // include files without any tests
      },
    },
  }
})
