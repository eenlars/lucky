import tsconfigPaths from "vite-tsconfig-paths"
/**
 * Package-specific Vitest config for @lucky/core
 * For DX: allows running `bunx vitest` inside the package directory
 */
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ["../../tsconfig.paths.json"] })],
  test: {
    globals: true,
    include: ["src/**/*.test.{ts,tsx}", "src/**/*.spec.test.{ts,tsx}"],
    environment: "node",
  },
})
