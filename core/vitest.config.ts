import { resolve } from "path"
import tsconfigPaths from "vite-tsconfig-paths"
import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "@core": resolve(__dirname, "./src"),
    },
  },
  test: {
    // global defaults shared by projects
    globals: true,
    environment: "node",
    exclude: [...configDefaults.exclude, "**/e2e/**"],
    // Avoid watching runtime output directories that may contain transient .tmp files
    watchExclude: ["**/.core-data/**", "**/.core-data/**/*", "**/logs/backups/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts}"],
      exclude: [
        "**/.core-data/**",
        "**/.core-data/**/*",
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
    },
    projects: [
      {
        // Unit tests: *.test.ts but NOT *.spec.test.ts
        extends: true,
        test: {
          name: { label: "unit", color: "cyan" },
          include: ["src/**/*.test.ts", "!src/**/*.spec.test.ts"],
          setupFiles: ["./src/__tests__/test-setup.ts"],
        },
      },
      {
        // Integration tests: *.spec.test.ts
        extends: true,
        test: {
          name: { label: "integration", color: "magenta" },
          include: ["src/**/*.spec.test.ts"],
          setupFiles: ["./src/__tests__/integration-setup.ts"],
          testTimeout: 120000,
        },
      },
    ],
  },
})
