#!/usr/bin/env bun
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

const env = process.env
const isCI = env.CI === "1" || env.CI === "true"
const isVercel = env.VERCEL === "1" || env.VERCEL === "true"
const skipGeneration = env.SKIP_DB_TYPES_GENERATION === "1" || env.SKIP_DB_TYPES_GENERATION === "true"
const recoverableErrorPattern =
  /AccessDenied|EACCES|ConnectionRefused|ENOTFOUND|ENETUNREACH|ECONNREFUSED|ECONNRESET|fetch failed|Cannot find package|ERR_MODULE_NOT_FOUND/i

// Define all schemas to generate - each schema gets its own file
const schemas = [
  { name: "public", filename: "public.types.ts" },
  { name: "iam", filename: "iam.types.ts" },
  { name: "lockbox", filename: "lockbox.types.ts" },
  { name: "app", filename: "app.types.ts" },
  { name: "mcp", filename: "mcp.types.ts" },
]

const projectId = "qnvprftdorualkdyogka"
const supabaseCliPath =
  env.SUPABASE_CLI_PATH ||
  (() => {
    try {
      return typeof Bun !== "undefined" && typeof Bun.which === "function" ? (Bun.which("supabase") ?? null) : null
    } catch {
      return null
    }
  })()

async function generateSchemaTypes(schemaName: string, outputFilename: string, tempDir: string) {
  const outPath = resolve(import.meta.dir, `../src/types/${outputFilename}`)

  console.log(`Generating ${schemaName} schema types…`)

  const baseArgs = ["gen", "types", "typescript", "--project-id", projectId, "--schema", schemaName]
  const command = supabaseCliPath ?? "bun"
  const args = supabaseCliPath ? baseArgs : ["x", "supabase@latest", ...baseArgs]
  const proc = Bun.spawn([command, ...args], {
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
    if (recoverableErrorPattern.test(combinedOutput)) {
      console.warn(
        `${schemaName} schema: Supabase CLI unavailable (likely due to permissions, network, or missing dependency). Using committed types.`,
      )
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

  const tempDir = resolve(import.meta.dir, "../.tmp/supabase")
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true })
  }

  // Run only if tmp is empty OR last run was > 2 hours ago
  const cooldownMs = 2 * 60 * 60 * 1000
  const stampFile = resolve(tempDir, ".last-run")
  const isTmpEmpty = (() => {
    try {
      const entries = readdirSync(tempDir)
      return entries.length === 0
    } catch {
      return true
    }
  })()

  let withinCooldown = false
  if (existsSync(stampFile)) {
    try {
      const mtime = statSync(stampFile).mtimeMs
      withinCooldown = Date.now() - mtime < cooldownMs
    } catch {
      withinCooldown = false
    }
  }

  if (!isTmpEmpty && withinCooldown) {
    const minsLeft = Math.ceil((cooldownMs - (Date.now() - statSync(stampFile).mtimeMs)) / 60000)
    console.log(`Skipping DB type generation (cooldown). Try again in ~${minsLeft}m or clear .tmp.`)
    return
  }

  console.log("Generating Supabase types for all schemas…")
  if (supabaseCliPath) {
    console.log(`Using Supabase CLI binary at ${supabaseCliPath}`)
  } else {
    console.log("Using bunx to execute Supabase CLI (no global binary detected)")
  }

  // Generate all schema types
  let anyGenerated = false
  for (const schema of schemas) {
    const ok = await generateSchemaTypes(schema.name, schema.filename, tempDir)
    anyGenerated = anyGenerated || ok
  }

  // Stamp only if at least one generation succeeded
  if (anyGenerated) {
    try {
      writeFileSync(stampFile, new Date().toISOString(), "utf-8")
    } catch {}
  }

  console.log("\n✓ All schema types generated successfully")
}

main().catch(err => {
  if (err instanceof Error && recoverableErrorPattern.test(err.message)) {
    console.warn(
      "Supabase type generation failed due to CLI permissions, network issues, or missing dependencies. Using committed types instead.",
    )
    console.warn("Set SKIP_DB_TYPES_GENERATION=1 to disable generation explicitly if needed.")
    return
  }
  console.error("Failed to generate database types:", err)
  console.error("To skip generation and use committed types, set SKIP_DB_TYPES_GENERATION=1")
  process.exit(1)
})
