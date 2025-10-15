import { resolve } from "node:path"
import tsconfigPaths from "vite-tsconfig-paths"
import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "@core": resolve(__dirname, "./src"),
      "@core/core-config": resolve(__dirname, "./src/core-config/coreConfig.ts"),
    },
  },
  test: {
    // global defaults shared by projects
    globals: true,
    environment: "node",
    testTimeout: 10000, // Increase from default 5000ms
    exclude: [...configDefaults.exclude, "**/e2e/**", "**/.core-data/**", "**/logs/**", "**/backups/**", "**/*.tmp"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts}"],
      exclude: [
        "**/.core-data/**",
        "**/logs/**",
        "**/backups/**",
        "**/*.tmp",
        "node_modules/",
        "**/*.d.ts",
        "**/*.test.ts",
        "**/*.spec.test.ts",
        "**/__tests__/**/*.test.ts",
        "**/__tests__/**/*.spec.test.ts",
        "**/__mocks__/**",
        "**/debug/**",
        "**/*.debug.*",
        "**/test-*.ts",
        "**/*.test.*.ts",
        "**/mocks/**",
        "**/examples/**",
        "**/scripts/**",
      ],
      all: true,
    },
    server: {
      deps: {
        // Avoid prebundling puppeteer/stealth which use dynamic requires for evasions
        inline: [/(?!.*)/],
        external: ["puppeteer", "puppeteer-extra", "puppeteer-extra-plugin", "puppeteer-extra-plugin-stealth"],
      },
      watch: {
        // Ignore runtime directories that may contain transient .tmp files
        ignored: ["**/.core-data/**", "**/logs/**", "**/backups/**", "**/*.tmp"],
      },
    },
    projects: [
      {
        // Unit tests: *.test.ts but NOT *.spec.test.ts
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts", "!src/**/*.spec.test.ts"],
          setupFiles: ["./src/__tests__/test-setup.ts"],
        },
      },
      {
        // Integration tests: *.spec.test.ts
        extends: true,
        test: {
          name: "integration",
          include: ["src/**/*.spec.test.ts"],
          setupFiles: ["./src/__tests__/integration-setup.ts"],
          testTimeout: 120000,
        },
      },
    ],
  },
})
