#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const filePath = resolve(__dirname, "../src/types/database.types.ts")

const content = readFileSync(filePath, "utf-8")

const fixed = content.replace(
  /export const Constants = \{/,
  "export type Constants = typeof _Constants\n\nconst _Constants = {",
)

writeFileSync(filePath, fixed, "utf-8")
console.log("✓ Fixed database.types.ts for type-only imports")
