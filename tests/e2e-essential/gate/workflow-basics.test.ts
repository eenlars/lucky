import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { resolveCoreFile } from "../utils/corePaths"
import { hashGoldenTrace } from "../utils/goldenTrace"

// This test verifies a tiny deterministic invariant on a known, stable artifact
// to act as an essential e2e gate with near-zero maintenance.
describe("essential gate: evolution-graph fixture hash", () => {
  it("matches golden hash after normalization", () => {
    const fixturePath = resolveCoreFile(
      "src",
      "messages",
      "api",
      "__tests__",
      "resources",
      "toolResponseNoToolUsed.json",
    )
    const content = fs.readFileSync(fixturePath, "utf8")
    const json = JSON.parse(content)
    const hash = hashGoldenTrace(json, {
      redactKeys: ["createdAt", "updatedAt", "uuid"],
    })

    const thisFile = fileURLToPath(import.meta.url)
    const thisDir = path.dirname(thisFile)
    const goldenPath = path.join(thisDir, "..", "golden", "workflow-basics.hash")
    const golden = fs.readFileSync(goldenPath, "utf8").trim()
    expect(hash).toBe(golden)
  })
})
