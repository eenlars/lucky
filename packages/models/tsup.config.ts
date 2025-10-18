import { defineConfig } from "tsup"

export default defineConfig({
  entry: {
    index: "src/index.ts",
    server: "src/server.ts",
    "config/define": "src/config/define.ts",
    "pricing/catalog": "src/pricing/catalog.ts",
  },
  format: ["esm"],
  platform: "node",
  dts: {
    resolve: true,
    // Generate .d.ts.map files so IDEs navigate to source, not dist
    compilerOptions: {
      declarationMap: true,
    },
  },
  sourcemap: true,
  clean: true,
  splitting: false,
  target: "node18",
  tsconfig: "./tsconfig.build.json",
  treeshake: true,
})
