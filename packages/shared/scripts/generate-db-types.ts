#!/usr/bin/env bun
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

const env = process.env
const isCI = env.CI === "1" || env.CI === "true"
const isVercel = env.VERCEL === "1" || env.VERCEL === "true"
const skipGeneration = env.SKIP_DB_TYPES_GENERATION === "1" || env.SKIP_DB_TYPES_GENERATION === "true"

// Define all schemas to generate - each schema gets its own file
const schemas = [
  { name: "public", filename: "public.types.ts" },
  { name: "iam", filename: "iam.types.ts" },
  { name: "lockbox", filename: "lockbox.types.ts" },
  { name: "app", filename: "app.types.ts" },
  { name: "mcp", filename: "mcp.types.ts" },
]

const projectId = "qnvprftdorualkdyogka"

async function generateSchemaTypes(schemaName: string, outputFilename: string, tempDir: string) {
  const outPath = resolve(import.meta.dir, `../src/types/${outputFilename}`)

  console.log(`Generating ${schemaName} schema types…`)

  const args = ["x", "supabase@latest", "gen", "types", "typescript", "--project-id", projectId, "--schema", schemaName]

  const proc = Bun.spawn(["bun", ...args], {
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      TMPDIR: tempDir,
      TEMP: tempDir,
      TMP: tempDir,
      BUN_INSTALL_CACHE: tempDir,
      BUN_INSTALL_TMPDIR: tempDir,
      XDG_CACHE_HOME: tempDir,
    },
  })

  const stdout = await new Response(proc.stdout).text()
  const stderr = proc.stderr ? await new Response(proc.stderr).text() : ""
  const exitCode = await proc.exited

  if (exitCode !== 0) {
    const combinedOutput = `${stdout}\n${stderr}`
    if (/AccessDenied|EACCES/i.test(combinedOutput)) {
      console.warn(`${schemaName} schema: Supabase CLI could not access temp directory. Skipping.`)
      return false
    }
    console.error(stderr.trim() || stdout.trim())
    throw new Error(`supabase gen types for ${schemaName} failed with code ${exitCode}`)
  }

  // Ensure directory exists
  const dir = dirname(outPath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  // Apply fix for Constants export if present
  const fixed = stdout.replace(
    /export const Constants = \{/,
    "export type Constants = typeof _Constants\n\nconst _Constants = {",
  )

  writeFileSync(outPath, fixed, "utf-8")
  console.log(`✓ ${schemaName} schema types generated at ${outPath}`)
  return true
}

async function main() {
  // Skip generation in CI/Vercel builds to use committed types
  if (skipGeneration || isCI || isVercel) {
    console.log("Using committed database types (Vercel/CI build)")
    return
  }

  console.log("Generating Supabase types for all schemas…")

  const tempDir = resolve(import.meta.dir, "../.tmp/supabase")
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true })
  }

  // Generate all schema types
  for (const schema of schemas) {
    await generateSchemaTypes(schema.name, schema.filename, tempDir)
  }

  console.log("\n✓ All schema types generated successfully")
}

main().catch(err => {
  if (err instanceof Error && /AccessDenied|EACCES/.test(err.message)) {
    console.warn("Supabase type generation failed due to temp directory permissions. Using committed types instead.")
    console.warn("Set SKIP_DB_TYPES_GENERATION=1 to disable generation explicitly if needed.")
    return
  }
  console.error("Failed to generate database types:", err)
  console.error("To skip generation and use committed types, set SKIP_DB_TYPES_GENERATION=1")
  process.exit(1)
})
