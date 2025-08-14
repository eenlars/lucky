import { resolve } from "path"
import tsconfigPaths from "vite-tsconfig-paths"
import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "@core": resolve(__dirname, "./src"),
      "@runtime": resolve(__dirname, "../runtime"),
    },
  },
  test: {
    // global defaults shared by projects
    globals: true,
    environment: "node",
    exclude: [...configDefaults.exclude, "**/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,js}"],
      exclude: ["node_modules/"],
      all: true,
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
