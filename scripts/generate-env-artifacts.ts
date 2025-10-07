#!/usr/bin/env bun
/**
 * Generate .env.example and turbo.env.generated.json from env-models schemas.
 * Run this whenever you add/change environment variables.
 *
 * Usage:
 *   bun run scripts/generate-env-artifacts.ts
 */

import { writeFileSync } from "node:fs"
import { join } from "node:path"
import {
  aiProviders,
  clerkClient,
  clerkServer,
  coreToggles,
  docs,
  searchProviders,
  supabaseClient,
  supabaseServer,
  toolProviders,
} from "../packages/shared/src/env-models"

// Collect all server and client environment variables
const ALL_SERVER = {
  ...clerkServer.shape,
  ...supabaseServer.shape,
  ...aiProviders.shape,
  ...searchProviders.shape,
  ...toolProviders.shape,
  ...coreToggles.shape,
}

const ALL_CLIENT = {
  ...clerkClient.shape,
  ...supabaseClient.shape,
}

// Generate globalEnv array for Turborepo
const globalEnv = [...Object.keys(ALL_SERVER), ...Object.keys(ALL_CLIENT)]

/**
 * Render .env.example file with sections and comments
 */
function renderEnvExample(): string {
  const header = `# .env.example — Generated from @lucky/shared/env-models
# DO NOT EDIT MANUALLY - run 'bun run gen:env' to regenerate
# Copy to .env.local and fill with your real values

`

  // Group docs by section
  const sections = new Map<string, typeof docs>()
  for (const doc of docs) {
    const section = doc.section || "Other"
    if (!sections.has(section)) {
      sections.set(section, [])
    }
    sections.get(section)!.push(doc)
  }

  // Render each section
  const lines: string[] = []
  for (const [sectionName, sectionDocs] of sections) {
    lines.push("# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    lines.push(`# ${sectionName}`)
    lines.push("# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    lines.push("")

    for (const doc of sectionDocs) {
      const requiredLabel = doc.required ? " (required)" : ""
      lines.push(`# ${doc.description}${requiredLabel}`)
      lines.push(`${doc.key}=${doc.example || ""}`)
      lines.push("")
    }
  }

  return header + lines.join("\n")
}

/**
 * Render turbo.env.generated.json
 */
function renderTurboEnvJson(): string {
  return JSON.stringify(
    {
      $schema: "https://turbo.build/schema.json",
      globalEnv,
    },
    null,
    2,
  )
}

// Write files
const rootDir = join(import.meta.dir, "..")
const envExamplePath = join(rootDir, ".env.example")
const turboEnvPath = join(rootDir, "turbo.env.generated.json")

try {
  writeFileSync(envExamplePath, renderEnvExample(), "utf-8")
  console.log(`✓ Generated ${envExamplePath}`)

  writeFileSync(turboEnvPath, renderTurboEnvJson(), "utf-8")
  console.log(`✓ Generated ${turboEnvPath}`)

  console.log("\n📋 Next steps:")
  console.log("1. Copy the globalEnv array from turbo.env.generated.json into turbo.json")
  console.log("2. Remove duplicate passThroughEnv entries from your turbo.json tasks")
  console.log("3. Commit both .env.example and turbo.env.generated.json")
} catch (error) {
  console.error("❌ Error generating env artifacts:", error)
  process.exit(1)
}
