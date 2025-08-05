import { defineConfig, loadEnv } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"
import { resolve } from "path"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  process.env = {
    ...process.env,
    ...env,
    NODE_ENV: mode as "development" | "production",
  }
  
  return {
    plugins: [tsconfigPaths()],
    build: {
      lib: {
        entry: resolve(__dirname, "code_tools/index.ts"),
        name: "Runtime",
        fileName: "index",
        formats: ["es", "cjs"]
      },
      rollupOptions: {
        external: (id) => {
          // External all node built-ins
          return /^node:/.test(id) || 
                 ["fs", "path", "url", "os", "crypto", "util", "events", "stream", "buffer", "vm", "fs/promises"].includes(id) ||
                 // External all dependencies (not devDependencies)
                 !id.startsWith(".") && !id.startsWith("/") && !id.includes(__dirname);
        }
      },
      outDir: "dist",
      sourcemap: true,
      target: "node18"
    }
  }
})