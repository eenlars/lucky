#!/usr/bin/env bun

import { execSync } from "child_process"
import { existsSync, mkdirSync, writeFileSync } from "fs"
import { join } from "path"

interface DepcheckResult {
  dependencies: string[]
  devDependencies: string[]
  missing: Record<string, string[]>
  using: Record<string, string[]>
  invalidFiles: Record<string, any>
  invalidDirs: Record<string, any>
}

interface TsPruneResult {
  file: string
  line: number
  name: string
}

interface DepsReport {
  timestamp: string
  core: {
    unused: {
      dependencies: string[]
      devDependencies: string[]
    }
    missing: Record<string, string[]>
    deadExports: TsPruneResult[]
  }
  app: {
    unused: {
      dependencies: string[]
      devDependencies: string[]
    }
    missing: Record<string, string[]>
    deadExports: TsPruneResult[]
  }
  summary: {
    totalUnusedDeps: number
    totalMissingDeps: number
    totalDeadExports: number
  }
}

function runDepcheck(dir: string): DepcheckResult {
  try {
    // Ignore internal workspace imports and common dev tools
    const ignorePatterns = [
      "@core/*",
      "@runtime/*",
      "@experiments/*",
      "@lucky/*",
      "vite",
      "date-fns",
      "highlight.js",
      "@radix-ui/react-visually-hidden",
      "dotenv",
    ].join(",")

    const result = execSync(`bunx depcheck "${dir}" --json --ignore-patterns="${ignorePatterns}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    })
    return JSON.parse(result)
  } catch (error: any) {
    // depcheck exits with non-zero when issues found, but still outputs JSON
    if (error.stdout) {
      return JSON.parse(error.stdout)
    }
    throw error
  }
}

function runTsPrune(dir: string): TsPruneResult[] {
  try {
    // ts-prune doesn't have a JSON output, so we parse the text
    const result = execSync(`bunx ts-prune ${dir}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    })

    if (!result.trim()) {
      return []
    }

    const lines = result.trim().split("\n")
    const exports: TsPruneResult[] = []

    for (const line of lines) {
      // Format: /path/to/file.ts:123 - exportName
      const match = line.match(/^(.+):(\d+) - (.+)$/)
      if (match) {
        exports.push({
          file: match[1],
          line: parseInt(match[2], 10),
          name: match[3],
        })
      }
    }

    return exports
  } catch (error: any) {
    // ts-prune exits with non-zero when dead exports found
    if (error.stdout) {
      const lines = error.stdout.trim().split("\n")
      const exports: TsPruneResult[] = []

      for (const line of lines) {
        const match = line.match(/^(.+):(\d+) - (.+)$/)
        if (match) {
          exports.push({
            file: match[1],
            line: parseInt(match[2], 10),
            name: match[3],
          })
        }
      }

      return exports
    }
    throw error
  }
}

async function main() {
  const projectRoot = join(__dirname, "..")
  const coreDir = join(projectRoot, "..", "core")
  const appDir = projectRoot
  const reportsDir = join(projectRoot, "reports")

  // Create reports directory if it doesn't exist
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true })
  }

  console.log("🔍 Checking dependencies and dead code...\n")

  // Run depcheck on core and app
  console.log("Running depcheck on core/...")
  const coreDepcheck = runDepcheck(coreDir)

  console.log("Running depcheck on app/...")
  const appDepcheck = runDepcheck(appDir)

  // Filter out internal workspace imports from missing dependencies
  const internalPatterns = /^@(core|runtime|experiments|lucky)\//
  const filterInternalDeps = (missing: Record<string, string[]>) => {
    const filtered: Record<string, string[]> = {}
    for (const [dep, files] of Object.entries(missing)) {
      if (!internalPatterns.test(dep)) {
        filtered[dep] = files
      }
    }
    return filtered
  }

  coreDepcheck.missing = filterInternalDeps(coreDepcheck.missing)
  appDepcheck.missing = filterInternalDeps(appDepcheck.missing)

  // Run ts-prune on core and app
  console.log("Running ts-prune on core/...")
  const coreTsPrune = runTsPrune(coreDir)

  console.log("Running ts-prune on app/...")
  const appTsPrune = runTsPrune(appDir)

  // Create report
  const timestamp = new Date().toISOString().split("T")[0]
  const report: DepsReport = {
    timestamp: new Date().toISOString(),
    core: {
      unused: {
        dependencies: coreDepcheck.dependencies,
        devDependencies: coreDepcheck.devDependencies,
      },
      missing: coreDepcheck.missing,
      deadExports: coreTsPrune,
    },
    app: {
      unused: {
        dependencies: appDepcheck.dependencies,
        devDependencies: appDepcheck.devDependencies,
      },
      missing: appDepcheck.missing,
      deadExports: appTsPrune,
    },
    summary: {
      totalUnusedDeps:
        coreDepcheck.dependencies.length +
        coreDepcheck.devDependencies.length +
        appDepcheck.dependencies.length +
        appDepcheck.devDependencies.length,
      totalMissingDeps: Object.keys(coreDepcheck.missing).length + Object.keys(appDepcheck.missing).length,
      totalDeadExports: coreTsPrune.length + appTsPrune.length,
    },
  }

  // Write JSON report
  const reportPath = join(reportsDir, `deps-${timestamp}.json`)
  writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n📄 Full report written to: ${reportPath}`)

  // Print human-readable summary
  console.log("\n📊 Summary:")
  console.log("==========")

  const missingDepsCount = report.summary.totalMissingDeps
  const unusedDepsCount = report.summary.totalUnusedDeps
  const deadExportsCount = report.summary.totalDeadExports

  if (missingDepsCount > 0) {
    console.log(`❌ Missing dependencies: ${missingDepsCount}`)
    if (Object.keys(coreDepcheck.missing).length > 0) {
      console.log("  Core:")
      for (const [dep, files] of Object.entries(coreDepcheck.missing)) {
        console.log(`    - ${dep} (used in ${files.length} files)`)
      }
    }
    if (Object.keys(appDepcheck.missing).length > 0) {
      console.log("  App:")
      for (const [dep, files] of Object.entries(appDepcheck.missing)) {
        console.log(`    - ${dep} (used in ${files.length} files)`)
      }
    }
  } else {
    console.log("✅ No missing dependencies")
  }

  if (unusedDepsCount > 0) {
    console.log(`\n⚠️  Unused dependencies: ${unusedDepsCount}`)
    if (coreDepcheck.dependencies.length > 0 || coreDepcheck.devDependencies.length > 0) {
      console.log("  Core:")
      coreDepcheck.dependencies.forEach((dep) => console.log(`    - ${dep}`))
      coreDepcheck.devDependencies.forEach((dep) => console.log(`    - ${dep} (dev)`))
    }
    if (appDepcheck.dependencies.length > 0 || appDepcheck.devDependencies.length > 0) {
      console.log("  App:")
      appDepcheck.dependencies.forEach((dep) => console.log(`    - ${dep}`))
      appDepcheck.devDependencies.forEach((dep) => console.log(`    - ${dep} (dev)`))
    }
  } else {
    console.log("✅ No unused dependencies")
  }

  if (deadExportsCount > 0) {
    console.log(`\n⚠️  Dead exports: ${deadExportsCount}`)
    console.log("  (Run 'bun run deps:check' to see full report)")
  } else {
    console.log("✅ No dead exports")
  }

  // Configuration for acceptable thresholds
  const THRESHOLDS = {
    missingDeps: 0, // Fail on any missing dependencies
    unusedDeps: 50, // Allow up to 50 unused deps (many are UI components)
    deadExports: 1000, // Allow up to 1000 dead exports (common in large codebases)
  }

  // Exit with error if there are critical issues
  const criticalErrors = missingDepsCount > THRESHOLDS.missingDeps
  const warningLevel = unusedDepsCount > THRESHOLDS.unusedDeps || deadExportsCount > THRESHOLDS.deadExports

  if (criticalErrors) {
    console.log("\n❌ Dependency check failed! Critical errors found.")
    console.log(`Missing dependencies exceed threshold (${THRESHOLDS.missingDeps})`)
    process.exit(1)
  } else if (warningLevel) {
    console.log("\n⚠️  Dependency check passed with warnings.")
    if (unusedDepsCount > THRESHOLDS.unusedDeps) {
      console.log(`Unused dependencies (${unusedDepsCount}) exceed threshold (${THRESHOLDS.unusedDeps})`)
    }
    if (deadExportsCount > THRESHOLDS.deadExports) {
      console.log(`Dead exports (${deadExportsCount}) exceed threshold (${THRESHOLDS.deadExports})`)
    }
    // Exit 0 for warnings in local dev, but could be changed for CI
    process.exit(0)
  } else {
    console.log("\n✅ All checks passed!")
  }
}

main().catch((error) => {
  console.error("Error running dependency check:", error)
  process.exit(1)
})
