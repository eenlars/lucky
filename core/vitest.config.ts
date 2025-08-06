import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"
import { resolve } from "path"

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/__tests__/test-setup.ts"],
  },
  resolve: {
    alias: {
      "@runtime": resolve(__dirname, "../runtime"),
      "@shared": resolve(__dirname, "../shared/src"),
    },
  },
})