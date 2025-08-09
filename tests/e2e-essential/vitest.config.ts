import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const thisFile = fileURLToPath(import.meta.url)
const thisDir = path.dirname(thisFile)
const repoRoot = path.join(thisDir, "..", "..")

export default defineConfig({
  resolve: {
    alias: {
      "@core": path.join(repoRoot, "core", "src"),
      "@runtime": path.join(repoRoot, "runtime"),
      "@shared": path.join(repoRoot, "shared", "src"),
    },
  },
  test: {
    include: [
      "tests/e2e-essential/**/*.test.ts",
      "tests/e2e-essential/**/*.test.tsx",
    ],
    setupFiles: [path.join(thisDir, "setup", "env.ts")],
    environment: "node",
    passWithNoTests: false,
    allowOnly: false,
    watch: false,
    testTimeout: 20000,
    hookTimeout: 20000,
    reporters: ["default"],
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
})
