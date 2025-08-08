import { resolve } from "path"
import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/__tests__/test-setup.ts"],
    exclude: ["**/e2e/**", "**/*.integration.test.*"],
  },
  resolve: {
    alias: {
      "@core": resolve(__dirname, "./src"),
      "@runtime": resolve(__dirname, "../runtime"),
      "@shared": resolve(__dirname, "../shared/src"),
    },
  },
})
