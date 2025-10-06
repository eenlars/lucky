#!/usr/bin/env tsx

import { cleanupStaleRecords } from "@core/utils/cleanup/cleanupStaleRecords"
import { createPersistence } from "@together/adapter-supabase"

async function main() {
  try {
    console.log("Starting cleanup...")
    // Auto-detects from USE_MOCK_PERSISTENCE env var, falls back to in-memory if Supabase not configured
    const persistence = createPersistence()
    const stats = await cleanupStaleRecords(persistence)
    console.log("Cleanup completed successfully:")
    console.log(JSON.stringify(stats, null, 2))
    process.exit(0)
  } catch (error) {
    console.error("Cleanup failed:", error)
    process.exit(1)
  }
}

main()
