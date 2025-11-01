#!/usr/bin/env bun
/**
 * Nuclear clean: removes ALL build artifacts, caches, and temporary files from the monorepo.
 * Removes: node_modules, dist, .turbo, .tmp, .cache, .next, coverage, .tsbuildinfo, bun.lock, .DS_Store
 * Useful when you need a completely clean slate.
 *
 * Usage: bun run superclean
 */

import { execSync } from "node:child_process"
import { existsSync } from "node:fs"
import { join } from "node:path"

const rootDir = join(import.meta.dir, "..")

console.log("Starting superclean...")
console.log("Removing all build artifacts, caches, and temporary files...\n")

try {
  console.log("→ Removing node_modules...")
  execSync('find . -name "node_modules" -type d -prune -exec rm -rf "{}" +', {
    cwd: rootDir,
    stdio: "inherit",
  })

  console.log("→ Removing dist folders...")
  execSync('find . -name "dist" -type d -prune -exec rm -rf "{}" +', {
    cwd: rootDir,
    stdio: "inherit",
  })

  console.log("→ Removing .turbo cache folders...")
  execSync('find . -name ".turbo" -type d -prune -exec rm -rf "{}" +', {
    cwd: rootDir,
    stdio: "inherit",
  })

  console.log("→ Removing .tmp directories...")
  execSync('find . -name ".tmp" -type d -prune -exec rm -rf "{}" +', {
    cwd: rootDir,
    stdio: "inherit",
  })

  console.log("→ Removing .cache directories...")
  execSync('find . -name ".cache" -type d -prune -exec rm -rf "{}" +', {
    cwd: rootDir,
    stdio: "inherit",
  })

  console.log("→ Removing .next directories...")
  execSync('find . -name ".next" -type d -prune -exec rm -rf "{}" +', {
    cwd: rootDir,
    stdio: "inherit",
  })

  console.log("→ Removing coverage directories...")
  execSync('find . -name "coverage" -type d -prune -exec rm -rf "{}" +', {
    cwd: rootDir,
    stdio: "inherit",
  })

  console.log("→ Removing .tsbuildinfo files...")
  execSync('find . -name "*.tsbuildinfo" -type f -exec rm -f "{}" +', {
    cwd: rootDir,
    stdio: "inherit",
  })

  console.log("→ Removing bun.lock files...")
  execSync('find . -name "bun.lock" -type f -exec rm -f "{}" +', {
    cwd: rootDir,
    stdio: "inherit",
  })

  console.log("→ Removing .DS_Store files...")
  execSync('find . -name ".DS_Store" -type f -exec rm -f "{}" +', {
    cwd: rootDir,
    stdio: "inherit",
  })

  console.log("\n✓ Superclean completed successfully")
  console.log("\nReinstalling dependencies...")

  execSync("bun install", {
    cwd: rootDir,
    stdio: "inherit",
  })

  console.log("\nRebuilding packages...")

  try {
    const envFile = join(rootDir, ".env")
    const envLocalFile = join(rootDir, ".env.local")
    const hasEnv = existsSync(envFile)
    const hasEnvLocal = existsSync(envLocalFile)

    const envFlags = [hasEnv ? "--env-file .env" : "", hasEnvLocal ? "--env-file .env.local" : ""]
      .filter(Boolean)
      .join(" ")

    const bunPrefix = envFlags ? `bun ${envFlags}` : "bun"

    execSync(`${bunPrefix} turbo run build --filter=@lucky/shared`, {
      cwd: rootDir,
      stdio: "inherit",
    })

    execSync(`${bunPrefix} turbo run build --filter=@lucky/shared --filter=@lucky/tools`, {
      cwd: rootDir,
      stdio: "inherit",
    })
  } catch {
    console.warn("⚠️ Build failed, but dependencies are installed")
    console.warn("You may need to run 'bun run build' manually after fixing any issues")
    console.log("\n✓ Superclean completed with build warnings")
    process.exit(0)
  }

  console.log("\n✓ Superclean completed successfully")
  console.log("Monorepo has been cleaned and rebuilt")
} catch (error) {
  console.error("❌ Error during superclean:", error)
  process.exit(1)
}
