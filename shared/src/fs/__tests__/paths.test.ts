import { mkdir, mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { readText } from "../paths"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe("readText path resolution", () => {
  it("reads an absolute path without prefixing base dir", async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), "readText-"))
    const absFile = path.join(tmp, "abs.txt")
    await writeFile(absFile, "ABSOLUTE", "utf8")

    const content = await readText(absFile)
    expect(content).toBe("ABSOLUTE")
  })

  it("reads a relative path when provided with caller's import.meta.url", async () => {
    const fixtures = path.join(__dirname, "fixtures")
    await mkdir(fixtures, { recursive: true })
    const relFile = path.join(fixtures, "rel.txt")
    await writeFile(relFile, "RELATIVE", "utf8")

    const content = await readText("./fixtures/rel.txt", import.meta.url)
    expect(content).toBe("RELATIVE")
  })

  it("uses the absolute path even if meta is provided", async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), "readText-meta-"))
    const absFile = path.join(tmp, "meta.txt")
    await writeFile(absFile, "ABSOLUTE_META", "utf8")

    const content = await readText(absFile, import.meta.url)
    expect(content).toBe("ABSOLUTE_META")
  })
})
