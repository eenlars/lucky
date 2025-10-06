#!/usr/bin/env bun
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

const env = process.env
const token = env.SUPABASE_ACCESS_TOKEN || ""
const isCI = env.CI === "1" || env.CI === "true"
const isVercel = env.VERCEL === "1" || env.VERCEL === "true"

const outPath = resolve(import.meta.dir, "../src/types/database.types.ts")

async function main() {
  if (!token) {
    // No token: skip generation gracefully, rely on committed types.
    console.log("Skipping Supabase types generation: SUPABASE_ACCESS_TOKEN not set")
    if (isCI || isVercel) {
      console.log("Detected CI/VERCEL. Using committed types if present…")
    } else {
      console.log("Tip: set SUPABASE_ACCESS_TOKEN locally to refresh generated types.")
    }
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
    "public,iam",
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
  // Do not fail CI if generation was optional; but since we only got here with a token, surfacing error is useful.
  console.error(err)
  process.exit(1)
})
