import { spawn } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const target = resolve(
  __dirname,
  "../src/research-experiments/tool-real/experiments/03-context-adaptation/run/runAdaptiveTest.ts"
)

const p = spawn("bunx", ["tsx", "--env-file=.env", target], {
  stdio: "inherit",
  cwd: resolve(__dirname, ".."),
})

p.on("exit", (code) => process.exit(code ?? 0))
