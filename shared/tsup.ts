import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  outDir: "dist",
  splitting: false,
  sourcemap: true,
  target: "node18",
  tsconfig: "./tsconfig.build.json",
  treeshake: true,
  // Include all TS files in src directory
  esbuildOptions(options) {
    options.external = ["react"]
  },
})
