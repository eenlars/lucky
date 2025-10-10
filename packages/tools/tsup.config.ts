import { defineConfig } from "tsup"

export default defineConfig({
  entry: {
    index: "src/index.ts",
    client: "src/client.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  external: [
    "@lucky/shared",
    /^@core\/.*/,
    /^@examples\/.*/,
    "ai",
    "zod",
    "@modelcontextprotocol/sdk",
    "glob",
    "node:fs",
    "node:path",
    "node:events",
    "node:stream",
    "fs",
    "path",
    "events",
    "stream",
    "crypto",
  ],
})
