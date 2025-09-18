#!/usr/bin/env bun
// @ts-nocheck

/**
 * Cleanup Script - Remove build artifacts and dependencies
 *
 * This script provides a safe way to clean up common build and dependency
 * directories in the project. It searches recursively for target directories
 * and removes them, with support for dry-run mode and verbose output.
 *
 * Target directories: dist, node_modules, .next
 *
 * Usage:
 *   bun cleanup           - Remove all target directories
 *   bun cleanup --dry-run - Preview what would be deleted
 *   bun cleanup --verbose - Show detailed removal progress
 *   bun cleanup --help    - Display help message
 */

import { $ } from "bun"
import { existsSync } from "fs"
import { parseArgs } from "util"

// Parse command line arguments
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    "dry-run": { type: "boolean", short: "n", default: false },
    verbose: { type: "boolean", short: "v", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
})

const isDryRun = values["dry-run"]
const isVerbose = values.verbose

/**
 * Target directories to be removed during cleanup:
 * - dist: Build output directories
 * - node_modules: Package dependencies
 * - .next: Next.js build cache
 */
const TARGETS = ["dist", "node_modules", ".next"]

/** Terminal color utilities for formatted output */
const colors = {
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
}

/** Display help message and exit */
if (values.help) {
  console.log(`Usage: bun cleanup [OPTIONS]

Options:
  -n, --dry-run    Show what would be deleted without removing
  -v, --verbose    Show detailed output
  -h, --help       Show this help message

Removes: ${TARGETS.join(", ")}`)
  process.exit(0)
}

/**
 * Safety check to prevent accidental cleanup in non-project directories.
 * Checks for presence of .git or package.json as indicators of project root.
 */
if (!existsSync(".git") && !existsSync("package.json")) {
  console.warn(
    colors.yellow("⚠ Not in a project root (no .git or package.json found)")
  )
  const response =
    await $`read -p "Continue anyway? (y/N) " -n 1 -r; echo $REPLY`.text()
  if (!response.match(/^[Yy]/)) {
    console.log("Cleanup cancelled")
    process.exit(0)
  }
}

/**
 * Main cleanup function that:
 * 1. Searches for all target directories recursively
 * 2. Removes found directories (or simulates in dry-run mode)
 * 3. Reports success/failure statistics
 *
 * @returns {Promise<void>} Exits with code 0 on success, 1 if any failures
 */
async function cleanup() {
  console.log(colors.blue("Starting cleanup..."))

  if (isDryRun) {
    console.log(colors.yellow("DRY-RUN: No files will be deleted"))
  }

  let totalRemoved = 0
  let totalFailed = 0

  for (const target of TARGETS) {
    try {
      /** Find all matching directories using Unix find command */
      const result =
        await $`find . -name "${target}" -type d 2>/dev/null`.quiet()
      const dirs = result.stdout.toString().split("\n").filter(Boolean)

      if (dirs.length === 0) {
        console.log(`✓ No ${target} directories found`)
        continue
      }

      console.log(
        `Found ${dirs.length} ${target} ${
          dirs.length === 1 ? "directory" : "directories"
        }`
      )

      /** Process each found directory for removal */
      for (const dir of dirs) {
        if (isDryRun) {
          console.log(`  [DRY-RUN] Would remove: ${dir}`)
          totalRemoved++
        } else {
          try {
            if (isVerbose) console.log(`  Removing: ${dir}`)
            await $`rm -rf "${dir}"`.quiet()
            totalRemoved++
          } catch {
            console.warn(colors.yellow(`  Failed to remove: ${dir}`))
            totalFailed++
          }
        }
      }
    } catch (err) {
      console.error(colors.red(`Error processing ${target}: ${err}`))
      totalFailed++
    }
  }

  /** Display cleanup summary statistics */
  console.log("\n====== Summary ======")
  console.log(colors.green(`✓ Removed: ${totalRemoved}`))
  if (totalFailed > 0) {
    console.log(colors.yellow(`⚠ Failed: ${totalFailed}`))
  }
  if (isDryRun) {
    console.log(colors.yellow("This was a dry run - no changes were made"))
  }

  process.exit(totalFailed > 0 ? 1 : 0)
}

cleanup().catch((err) => {
  console.error(colors.red(`Cleanup failed: ${err}`))
  process.exit(1)
})
