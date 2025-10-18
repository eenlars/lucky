import { defineConfig } from "tsup"

export default defineConfig({
  entry: {
    index: "src/index.ts",
  },
  format: ["esm"],
  platform: "node",
  dts: { resolve: true },
  sourcemap: true,
  clean: true,
  splitting: false,
  target: "node18",
  tsconfig: "./tsconfig.build.json",
  treeshake: true,
})
