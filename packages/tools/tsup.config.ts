import { defineConfig } from "tsup"

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "factory/index": "src/factory/index.ts",
    "registry/index": "src/registry/index.ts",
    "config/index": "src/config/index.ts",
    // mcp and selection will be added in later phases
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  external: ["@lucky/shared", "ai", "zod", "@modelcontextprotocol/sdk"],
})
