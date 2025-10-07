import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/agent.ts", "src/workflow.ts", "src/messages.ts", "src/tools.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  target: "es2022",
  external: ["zod"],
})
