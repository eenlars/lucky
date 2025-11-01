#!/usr/bin/env bun
/**
 * nuclear clean: removes ALL build artifacts, caches, and temporary files from the monorepo.
 * removes: node_modules, dist, .turbo, .tmp, .cache, .next, coverage, .tsbuildinfo, bun.lock, .DS_Store
 * useful when you need a completely clean slate.
 *
 * usage:
 *   bun run superclean
 */

import { execSync } from "node:child_process"
import { existsSync } from "node:fs"
import { join } from "node:path"

const rootDir = join(import.meta.dir, "..")

console.log("🧹 starting superclean...")
console.log("removing all build artifacts, caches, and temporary files...\n")

try {
  // remove all node_modules
  console.log("→ removing node_modules...")
  execSync('find . -name "node_modules" -type d -prune -exec rm -rf "{}" +', {
    cwd: rootDir,
    stdio: "inherit",
  })

  // remove all dist folders
  console.log("→ removing dist folders...")
  execSync('find . -name "dist" -type d -prune -exec rm -rf "{}" +', {
    cwd: rootDir,
    stdio: "inherit",
  })

  // remove all .turbo cache folders
  console.log("→ removing .turbo cache folders...")
  execSync('find . -name ".turbo" -type d -prune -exec rm -rf "{}" +', {
    cwd: rootDir,
    stdio: "inherit",
  })

  // remove all .tmp directories
  console.log("→ removing .tmp directories...")
  execSync('find . -name ".tmp" -type d -prune -exec rm -rf "{}" +', {
    cwd: rootDir,
    stdio: "inherit",
  })

  // remove all .cache directories
  console.log("→ removing .cache directories...")
  execSync('find . -name ".cache" -type d -prune -exec rm -rf "{}" +', {
    cwd: rootDir,
    stdio: "inherit",
  })

  // remove all .next directories (Next.js build cache)
  console.log("→ removing .next directories...")
  execSync('find . -name ".next" -type d -prune -exec rm -rf "{}" +', {
    cwd: rootDir,
    stdio: "inherit",
  })

  // remove all coverage directories
  console.log("→ removing coverage directories...")
  execSync('find . -name "coverage" -type d -prune -exec rm -rf "{}" +', {
    cwd: rootDir,
    stdio: "inherit",
  })

  // remove all .tsbuildinfo files
  console.log("→ removing .tsbuildinfo files...")
  execSync('find . -name "*.tsbuildinfo" -type f -exec rm -f "{}" +', {
    cwd: rootDir,
    stdio: "inherit",
  })

  // remove all bun.lock files
  console.log("→ removing bun.lock files...")
  execSync('find . -name "bun.lock" -type f -exec rm -f "{}" +', {
    cwd: rootDir,
    stdio: "inherit",
  })

  // remove all .DS_Store files (macOS)
  console.log("→ removing .DS_Store files...")
  execSync('find . -name ".DS_Store" -type f -exec rm -f "{}" +', {
    cwd: rootDir,
    stdio: "inherit",
  })

  console.log("\n✓ superclean completed successfully")
  console.log("\n📋 reinstalling dependencies...")

  // reinstall dependencies
  execSync("bun install", {
    cwd: rootDir,
    stdio: "inherit",
  })

  console.log("\n📋 rebuilding packages...")

  // rebuild packages - build shared first, then everything else
  try {
    // Check if .env files exist and build env-file flags accordingly
    const envFile = join(rootDir, ".env")
    const envLocalFile = join(rootDir, ".env.local")
    const hasEnv = existsSync(envFile)
    const hasEnvLocal = existsSync(envLocalFile)

    const envFlags = [hasEnv ? "--env-file .env" : "", hasEnvLocal ? "--env-file .env.local" : ""]
      .filter(Boolean)
      .join(" ")

    const bunPrefix = envFlags ? `bun ${envFlags}` : "bun"

    // Build shared package first
    execSync(`${bunPrefix} turbo run build --filter=@lucky/shared`, {
      cwd: rootDir,
      stdio: "inherit",
    })

    // Build other packages
    execSync(`${bunPrefix} turbo run build --filter=@lucky/shared --filter=@lucky/tools`, {
      cwd: rootDir,
      stdio: "inherit",
    })
  } catch {
    console.warn("⚠️ build failed, but dependencies are installed")
    console.warn("you may need to run 'bun run build' manually after fixing any issues")
    console.log("\n✓ superclean completed (with build warnings)")
    process.exit(0)
  }

  console.log("\n🎉💥 SUPERCLEAN NUCLEAR OPTION COMPLETED! 💥🎉")
  console.log("🚀✨ YOUR MONOREPO HAS BEEN OBLITERATED AND REBORN FROM THE ASHES! ✨🚀")
  console.log("🔥 EVERYTHING IS PRISTINE! EVERYTHING IS PERFECT! EVERYTHING IS READY TO DOMINATE! 🔥")
} catch (error) {
  console.error("❌ error during superclean:", error)
  process.exit(1)
}
