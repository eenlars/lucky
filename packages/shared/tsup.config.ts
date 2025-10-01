// tsup.config.ts
import { defineConfig } from "tsup"

export default defineConfig([
  // Browser-safe main and client builds
  {
    entry: {
      index: "src/index.ts",
      client: "src/client.ts",
    },
    format: ["esm"],
    platform: "browser",
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    target: "es2020",
    tsconfig: "./tsconfig.build.json",
    treeshake: true,
  },
  // Node.js-only subpaths
  {
    entry: {
      "fs/index": "src/fs/index.ts",
      "csv/index": "src/csv/index.ts",
    },
    format: ["esm"],
    platform: "node",
    dts: true,
    sourcemap: true,
    clean: false,
    splitting: false,
    target: "node18",
    tsconfig: "./tsconfig.build.json",
    treeshake: true,
  },
])
