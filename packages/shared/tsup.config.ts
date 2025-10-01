// tsup.config.ts
import { defineConfig } from "tsup"

export default defineConfig({
  entry: {
    index: "src/index.ts",
    client: "src/client.ts",
    "fs/index": "src/fs/index.ts",
    "csv/index": "src/csv/index.ts",
  },
  format: ["esm"],
  platform: "node",
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  target: "node18",
  tsconfig: "./tsconfig.build.json",
  treeshake: true,
})
