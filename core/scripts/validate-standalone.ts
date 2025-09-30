#!/usr/bin/env bun
/**
 * Validates that core is standalone by checking for external dependencies.
 * Run this script to track migration progress.
 */

import fs from "fs"
import path from "path"
import { glob } from "glob"

const CORE_ROOT = path.join(__dirname, "..")
const SRC_DIR = path.join(CORE_ROOT, "src")

interface ValidationResult {
  externalImports: {
    runtime: string[]
    luckyShared: string[]
  }
  usageStats: {
    configUsages: number
    pathsUsages: number
    modelsUsages: number
  }
  issues: string[]
  progress: {
    filesScanned: number
    filesWithExternalDeps: number
    percentStandalone: number
  }
}

async function scanFiles(): Promise<ValidationResult> {
  const result: ValidationResult = {
    externalImports: {
      runtime: [],
      luckyShared: [],
    },
    usageStats: {
      configUsages: 0,
      pathsUsages: 0,
      modelsUsages: 0,
    },
    issues: [],
    progress: {
      filesScanned: 0,
      filesWithExternalDeps: 0,
      percentStandalone: 0,
    },
  }

  // Find all TypeScript files in src
  const files = await glob("**/*.ts", {
    cwd: SRC_DIR,
    absolute: true,
    ignore: ["node_modules/**", "**/*.d.ts"],
  })

  result.progress.filesScanned = files.length

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8")
    const relativePath = path.relative(CORE_ROOT, file)
    let hasExternalDeps = false

    // Check for @runtime imports
    const runtimeImports = content.match(/from\s+['"]@runtime[^'"]*['"]/g)
    if (runtimeImports) {
      hasExternalDeps = true
      result.externalImports.runtime.push(`${relativePath}: ${runtimeImports.length} imports`)
    }

    // Check for @lucky/shared imports
    const sharedImports = content.match(/from\s+['"]@lucky\/shared[^'"]*['"]/g)
    if (sharedImports) {
      hasExternalDeps = true
      result.externalImports.luckyShared.push(`${relativePath}: ${sharedImports.length} imports`)
    }

    // Count CONFIG usages
    const configMatches = content.match(/\bCONFIG\./g)
    if (configMatches) {
      result.usageStats.configUsages += configMatches.length
    }

    // Count PATHS usages
    const pathsMatches = content.match(/\bPATHS\./g)
    if (pathsMatches) {
      result.usageStats.pathsUsages += pathsMatches.length
    }

    // Count getDefaultModels usages
    const modelsMatches = content.match(/getDefaultModels/g)
    if (modelsMatches) {
      result.usageStats.modelsUsages += modelsMatches.length
    }

    if (hasExternalDeps) {
      result.progress.filesWithExternalDeps++
    }
  }

  result.progress.percentStandalone =
    ((result.progress.filesScanned - result.progress.filesWithExternalDeps) / result.progress.filesScanned) * 100

  // Check tsconfig
  const tsconfigPath = path.join(CORE_ROOT, "tsconfig.json")
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf-8"))

  if (tsconfig.compilerOptions?.paths?.["@runtime/*"]) {
    result.issues.push("tsconfig.json still includes @runtime/* path mapping")
  }

  if (tsconfig.compilerOptions?.paths?.["@lucky/shared"]) {
    result.issues.push("tsconfig.json still includes @lucky/shared path mapping")
  }

  if (tsconfig.include?.some((p: string) => p.includes("../runtime") || p.includes("../packages"))) {
    result.issues.push("tsconfig.json still includes external files")
  }

  // Check vitest config
  const vitestConfigPath = path.join(CORE_ROOT, "vitest.config.ts")
  const vitestConfig = fs.readFileSync(vitestConfigPath, "utf-8")

  if (vitestConfig.includes("@runtime")) {
    result.issues.push("vitest.config.ts still includes @runtime alias")
  }

  return result
}

function printReport(result: ValidationResult): void {
  console.log("\n" + "=".repeat(60))
  console.log("CORE STANDALONE VALIDATION REPORT")
  console.log("=".repeat(60))

  console.log("\n📊 PROGRESS")
  console.log(`Files scanned: ${result.progress.filesScanned}`)
  console.log(`Files with external deps: ${result.progress.filesWithExternalDeps}`)
  console.log(`Standalone progress: ${result.progress.percentStandalone.toFixed(1)}%`)

  console.log("\n📦 EXTERNAL IMPORTS")
  console.log(`\n@runtime/* imports: ${result.externalImports.runtime.length} files`)
  if (result.externalImports.runtime.length > 0) {
    console.log("Top 10 files:")
    result.externalImports.runtime.slice(0, 10).forEach((line) => console.log(`  - ${line}`))
    if (result.externalImports.runtime.length > 10) {
      console.log(`  ... and ${result.externalImports.runtime.length - 10} more`)
    }
  }

  console.log(`\n@lucky/shared imports: ${result.externalImports.luckyShared.length} files`)
  if (result.externalImports.luckyShared.length > 0) {
    result.externalImports.luckyShared.forEach((line) => console.log(`  - ${line}`))
  }

  console.log("\n📈 USAGE STATISTICS")
  console.log(`CONFIG.* usages: ${result.usageStats.configUsages}`)
  console.log(`PATHS.* usages: ${result.usageStats.pathsUsages}`)
  console.log(`getDefaultModels usages: ${result.usageStats.modelsUsages}`)

  if (result.issues.length > 0) {
    console.log("\n⚠️  CONFIGURATION ISSUES")
    result.issues.forEach((issue) => console.log(`  - ${issue}`))
  }

  console.log("\n" + "=".repeat(60))

  if (
    result.externalImports.runtime.length === 0 &&
    result.externalImports.luckyShared.length === 0 &&
    result.issues.length === 0
  ) {
    console.log("✅ CORE IS STANDALONE!")
  } else {
    console.log("❌ Core still has external dependencies")
    console.log("\nNext steps:")
    if (result.externalImports.runtime.length > 0 || result.externalImports.luckyShared.length > 0) {
      console.log("  1. Update imports to use @core/core-config/compat")
    }
    if (result.issues.length > 0) {
      console.log("  2. Update tsconfig.json and vitest.config.ts")
    }
  }

  console.log("=".repeat(60) + "\n")
}

// Run validation
scanFiles()
  .then(printReport)
  .catch((error) => {
    console.error("Validation failed:", error)
    process.exit(1)
  })