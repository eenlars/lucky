import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { resolveCoreFile } from "../utils/corePaths"
import { hashGoldenTrace } from "../utils/goldenTrace"

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

function main() {
  const inputPath = resolveCoreFile(
    "src",
    "messages",
    "api",
    "__tests__",
    "resources",
    "toolResponseNoToolUsed.json"
  )
  if (!fs.existsSync(inputPath)) {
    console.error("Could not find fixture:", inputPath)
    process.exit(1)
  }
  const content = fs.readFileSync(inputPath, "utf8")
  const json = JSON.parse(content)
  const hash = hashGoldenTrace(json, {
    redactKeys: ["createdAt", "updatedAt", "uuid"],
  })

  const thisFile = fileURLToPath(import.meta.url)
  const thisDir = path.dirname(thisFile)
  const outDir = path.join(thisDir, "..", "golden")
  ensureDir(outDir)
  const outPath = path.join(outDir, "workflow-basics.hash")
  fs.writeFileSync(outPath, hash + "\n", "utf8")
  console.log("Updated:", outPath, "=>", hash)
}

main()
