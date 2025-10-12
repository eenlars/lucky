#!/usr/bin/env bun
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

const env = process.env
const isCI = env.CI === "1" || env.CI === "true"
const isVercel = env.VERCEL === "1" || env.VERCEL === "true"
const skipGeneration = env.SKIP_DB_TYPES_GENERATION === "1" || env.SKIP_DB_TYPES_GENERATION === "true"

const outPath = resolve(import.meta.dir, "../src/types/database.types.ts")
const appOutPath = resolve(import.meta.dir, "../src/types/app.types.ts")
const mcpOutPath = resolve(import.meta.dir, "../src/types/mcp.types.ts")

async function main() {
  // Skip generation in CI/Vercel builds to use committed types
  if (skipGeneration || isCI || isVercel) {
    console.log("Using committed database types (Vercel/CI build)")
    return
  }

  console.log("Generating Supabase types…")

  const tempDir = resolve(import.meta.dir, "../.tmp/supabase")
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true })
  }
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

  const appArgs = [
    "x",
    "supabase@latest",
    "gen",
    "types",
    "typescript",
    "--project-id",
    "qnvprftdorualkdyogka",
    "--schema",
    "app",
  ]

  const mcpArgs = [
    "x",
    "supabase@latest",
    "gen",
    "types",
    "typescript",
    "--project-id",
    "qnvprftdorualkdyogka",
    "--schema",
    "mcp",
  ]

  // Generate database types
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
      console.warn("Supabase CLI could not access its temp directory. Using committed types instead.")
      return
    }
    console.error(stderr.trim() || stdout.trim())
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

  // Generate app types
  console.log("Generating app types…")
  const appProc = Bun.spawn(["bun", ...appArgs], {
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
  const appStdout = await new Response(appProc.stdout).text()
  const appStderr = appProc.stderr ? await new Response(appProc.stderr).text() : ""
  const appExitCode = await appProc.exited
  if (appExitCode !== 0) {
    const combinedOutput = `${appStdout}\n${appStderr}`
    if (/AccessDenied|EACCES/i.test(combinedOutput)) {
      console.warn("App type generation: Supabase CLI could not access its temp directory. Skipping app types.")
      return
    }
    console.error(appStderr.trim() || appStdout.trim())
    throw new Error(`supabase gen types for app failed with code ${appExitCode}`)
  }

  // Write app types
  const appDir = dirname(appOutPath)
  if (!existsSync(appDir)) mkdirSync(appDir, { recursive: true })
  writeFileSync(appOutPath, appStdout, "utf-8")
  console.log("✓ App types generated at", appOutPath)

  // Generate MCP types
  console.log("Generating MCP types…")
  const mcpProc = Bun.spawn(["bun", ...mcpArgs], {
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
  const mcpStdout = await new Response(mcpProc.stdout).text()
  const mcpStderr = mcpProc.stderr ? await new Response(mcpProc.stderr).text() : ""
  const mcpExitCode = await mcpProc.exited
  if (mcpExitCode !== 0) {
    const combinedOutput = `${mcpStdout}\n${mcpStderr}`
    if (/AccessDenied|EACCES/i.test(combinedOutput)) {
      console.warn("MCP type generation: Supabase CLI could not access its temp directory. Skipping MCP types.")
      return
    }
    console.error(mcpStderr.trim() || mcpStdout.trim())
    throw new Error(`supabase gen types for MCP failed with code ${mcpExitCode}`)
  }

  // Write MCP types
  const mcpDir = dirname(mcpOutPath)
  if (!existsSync(mcpDir)) mkdirSync(mcpDir, { recursive: true })
  writeFileSync(mcpOutPath, mcpStdout, "utf-8")
  console.log("✓ MCP types generated at", mcpOutPath)
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
