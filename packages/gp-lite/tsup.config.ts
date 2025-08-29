import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  minify: true,
  sourcemap: true,
  treeshake: true,
  splitting: false,
  target: "es2015",
  outDir: "dist",
  shims: true,
  legacyOutput: false,
  metafile: false,
  tsconfig: "./tsconfig.build.json"
})
