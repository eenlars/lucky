#!/usr/bin/env tsx

import { cleanupStaleRecords } from "../src/core/utils/cleanup/cleanupStaleRecords"

async function main() {
  try {
    console.log("Starting cleanup...")
    const stats = await cleanupStaleRecords()
    console.log("Cleanup completed successfully:")
    console.log(JSON.stringify(stats, null, 2))
    process.exit(0)
  } catch (error) {
    console.error("Cleanup failed:", error)
    process.exit(1)
  }
}

main()
