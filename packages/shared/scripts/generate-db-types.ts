#!/usr/bin/env bun
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

const env = process.env
const isCI = env.CI === "1" || env.CI === "true"
const isVercel = env.VERCEL === "1" || env.VERCEL === "true"
const skipGeneration = env.SKIP_DB_TYPES_GENERATION === "1" || env.SKIP_DB_TYPES_GENERATION === "true"

const outPath = resolve(import.meta.dir, "../src/types/database.types.ts")

async function main() {
  // Skip generation in CI/Vercel builds to use committed types
  if (skipGeneration || isCI || isVercel) {
    console.log("Using committed database types (Vercel/CI build)")
    return
  }

  console.log("Generating Supabase types…")
  const args = [
    "x",
    "supabase@latest",
    "gen",
    "types",
    "typescript",
    "--project-id",
    "qnvprftdorualkdyogka",
    "--schema",
    "public,iam,lockbox",
  ]

  const proc = Bun.spawn(["bun", ...args], { stdout: "pipe", stderr: "inherit" })
  const stdout = await new Response(proc.stdout).text()
  const exitCode = await proc.exited
  if (exitCode !== 0) {
    throw new Error(`supabase gen types failed with code ${exitCode}`)
  }

  // Ensure directory exists and write file
  const dir = dirname(outPath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(outPath, stdout, "utf-8")

  // Apply local fix equivalent to scripts/fix-db-types.ts to avoid a second spawn
  const fixed = stdout.replace(
    /export const Constants = \{/,
    "export type Constants = typeof _Constants\n\nconst _Constants = {",
  )
  writeFileSync(outPath, fixed, "utf-8")
  console.log("✓ Supabase types generated and fixed at", outPath)
}

main().catch(err => {
  console.error("Failed to generate database types:", err)
  console.error("To skip generation and use committed types, set SKIP_DB_TYPES_GENERATION=1")
  process.exit(1)
})
