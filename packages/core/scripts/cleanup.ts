#!/usr/bin/env tsx

import { cleanupStaleRecords } from "@core/utils/cleanup/cleanupStaleRecords"
import { SupabasePersistence } from "@together/adapter-supabase"

async function main() {
  try {
    console.log("Starting cleanup...")
    const persistence = new SupabasePersistence()
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
