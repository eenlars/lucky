/**
 * Validate YAML Configurations
 *
 * Tests that all example YAML configs are valid
 */

import { readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { glob } from "glob"
import { parse as parseYaml } from "yaml"
import { userConfigSchema } from "../src/types/schemas"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const configDir = join(__dirname, "..", "configs")

async function validateConfig(path: string): Promise<{
  valid: boolean
  errors?: string[]
}> {
  try {
    const content = await readFile(path, "utf-8")
    const rawConfig = parseYaml(content)

    // Validate with Zod
    const result = userConfigSchema.safeParse(rawConfig)

    if (result.success) {
      return { valid: true }
    }
    return {
      valid: false,
      errors: result.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`),
    }
  } catch (error) {
    return {
      valid: false,
      errors: [(error as Error).message],
    }
  }
}

async function main() {
  console.log("🔍 Validating YAML Configurations\n")

  // Find all YAML files in configs directory
  const yamlFiles = await glob("*.yaml", { cwd: configDir })

  if (yamlFiles.length === 0) {
    console.log("⚠️  No YAML files found in configs directory")
    return
  }

  let totalFiles = 0
  let validFiles = 0
  let invalidFiles = 0

  for (const file of yamlFiles) {
    const filePath = join(configDir, file)
    totalFiles++

    console.log(`📄 ${file}`)

    const result = await validateConfig(filePath)

    if (result.valid) {
      console.log("   ✅ Valid\n")
      validFiles++
    } else {
      console.log("   ❌ Invalid")
      result.errors?.forEach(error => {
        console.log(`      - ${error}`)
      })
      console.log()
      invalidFiles++
    }
  }

  console.log("=".repeat(60))
  console.log("📊 Summary:")
  console.log(`   Total files: ${totalFiles}`)
  console.log(`   Valid: ${validFiles}`)
  console.log(`   Invalid: ${invalidFiles}`)
  console.log("=".repeat(60))

  if (invalidFiles > 0) {
    console.log("\n❌ Validation failed")
    process.exit(1)
  } else {
    console.log("\n✅ All configs are valid!")
    process.exit(0)
  }
}

main().catch(error => {
  console.error("Error:", error)
  process.exit(1)
})
