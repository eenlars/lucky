import { resolve } from "path"
import { defineConfig, loadEnv } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"

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
        name: "Examples",
        fileName: "index",
        formats: ["es", "cjs"],
      },
      rollupOptions: {
        external: id => {
          // Keep browser automation deps external so the stealth runtime can own them
          const externalDependencies = [
            "puppeteer",
            "puppeteer-extra",
            "puppeteer-extra-plugin-stealth",
            "puppeteer-extra-plugin-user-preferences",
            "puppeteer-extra-plugin-adblocker",
          ]

          if (
            externalDependencies.some(
              dep => id === dep || id.startsWith(`${dep}/`),
            )
          ) {
            return true
          }

          // External node built-ins
          if (
            /^node:/.test(id) ||
            [
              "fs",
              "path",
              "url",
              "os",
              "crypto",
              "util",
              "events",
              "stream",
              "buffer",
              "vm",
              "fs/promises",
              "http",
              "https",
              "net",
              "tls",
              "dns",
              "assert",
              "zlib",
              "module",
              "child_process",
              "process",
              "worker_threads",
              "querystring",
              "readline",
              "dgram",
              "cluster",
              "console",
              "constants",
              "domain",
              "inspector",
              "punycode",
              "repl",
              "string_decoder",
              "sys",
              "timers",
              "tty",
              "v8",
            ].includes(id)
          ) {
            return true
          }

          // Allow internal module imports (@core, @shared only - NOT @examples since that's this module)
          if (id.startsWith("@core/") || id.startsWith("@shared/")) {
            return true
          }

          // Bundle everything else (npm packages)
          return false
        },
      },
      outDir: "dist",
      sourcemap: true,
      target: "node18",
    },
  }
})
