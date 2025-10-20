#!/usr/bin/env bun
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

interface TsConfig {
  extends?: string
  compilerOptions?: {
    module?: string
    moduleResolution?: string
    composite?: boolean
    declaration?: boolean
  }
  include?: string[]
  references?: Array<{ path: string }>
}

const errors: string[] = []
const warnings: string[] = []
const packagesDir = join(process.cwd(), "packages")
const appsDir = join(process.cwd(), "apps")

function validateTsConfig(_dir: string, name: string, tsconfigPath: string) {
  // Skip if tsconfig doesn't exist
  if (!existsSync(tsconfigPath)) {
    return
  }

  try {
    const content = readFileSync(tsconfigPath, "utf-8")
    const tsconfig: TsConfig = JSON.parse(content)

    // CHECK 1: No cross-package file includes
    if (tsconfig.include) {
      const crossPackageIncludes = tsconfig.include.filter(
        path =>
          path.includes("../") &&
          !path.startsWith("../../") &&
          (path.includes("/src/") || path.endsWith(".ts") || path.endsWith(".tsx")),
      )

      if (crossPackageIncludes.length > 0) {
        errors.push(
          `❌ ${name}: includes files from other packages:
${crossPackageIncludes.map(p => `   - ${p}`).join("\n")}
   This causes infinite type resolution loops!
   Import from the package instead (e.g., @lucky/models)`,
        )
      }
    }

    // CHECK 2: Module resolution consistency
    if (tsconfig.extends?.includes("tsconfig.base.json")) {
      const { module, moduleResolution } = tsconfig.compilerOptions || {}

      // Normalize to lowercase for comparison
      const moduleNorm = module?.toLowerCase()
      const resolutionNorm = moduleResolution?.toLowerCase()

      // If extending base, should use bundler resolution (not NodeNext)
      if (resolutionNorm === "nodenext" || resolutionNorm === "node16") {
        errors.push(
          `❌ ${name}: uses "${moduleResolution}" resolution while extending tsconfig.base.json
   This causes module resolution conflicts and infinite type loops!
   Change to: "moduleResolution": "bundler"`,
        )
      }

      if (moduleNorm === "nodenext" || moduleNorm === "node16") {
        errors.push(
          `❌ ${name}: uses "${module}" module while extending tsconfig.base.json
   This conflicts with the monorepo's bundler-based setup!
   Change to: "module": "ESNext" or "esnext"`,
        )
      }
    }

    // CHECK 3: Composite without being in references
    if (tsconfig.compilerOptions?.composite && !tsconfig.extends?.includes("tsconfig.base.json")) {
      warnings.push(
        `⚠️  ${name}: has "composite": true but doesn't extend tsconfig.base.json
   This might be intentional if it's a standalone package`,
      )
    }

    // CHECK 4: Warn about composite packages not using recommended settings
    if (tsconfig.compilerOptions?.composite) {
      if (!tsconfig.compilerOptions?.declaration) {
        warnings.push(`⚠️  ${name}: composite package should have "declaration": true`)
      }
    }
  } catch (e) {
    errors.push(`❌ ${name}: Failed to parse tsconfig.json - ${e}`)
  }
}

// Validate packages
try {
  const packages = readdirSync(packagesDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)

  for (const pkg of packages) {
    const tsconfigPath = join(packagesDir, pkg, "tsconfig.json")
    validateTsConfig("packages", `packages/${pkg}`, tsconfigPath)
  }
} catch (e) {
  console.error(`Error reading packages directory: ${e}`)
}

// Validate apps
try {
  const apps = readdirSync(appsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)

  for (const app of apps) {
    const tsconfigPath = join(appsDir, app, "tsconfig.json")
    validateTsConfig("apps", `apps/${app}`, tsconfigPath)
  }
} catch (e) {
  console.error(`Error reading apps directory: ${e}`)
}

// Print results
if (warnings.length > 0) {
  console.log("\n⚠️  TypeScript Configuration Warnings:\n")
  console.log(warnings.join("\n\n"))
}

if (errors.length > 0) {
  console.error("\n🚨 TypeScript Configuration Errors:\n")
  console.error(errors.join("\n\n"))
  console.error("\nFix these issues to prevent build failures and infinite type resolution loops.")
  process.exit(1)
}

console.log("\n✅ All tsconfig.json files validated successfully!")
