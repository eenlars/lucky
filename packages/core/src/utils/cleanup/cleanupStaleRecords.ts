import { lgg } from "@core/utils/logging/Logger"
import type { CleanupStats, IPersistence } from "@lucky/adapter-supabase"

/**
 * cleanup stale records from the database
 * removes records with no activity for more than 10 minutes
 */
export async function cleanupStaleRecords(persistence: IPersistence): Promise<CleanupStats> {
  try {
    const stats = await persistence.cleanupStaleRecords()

    lgg.info(`marked ${stats.workflowInvocations} stale workflow invocations as failed`)
    lgg.info(`marked ${stats.nodeInvocations} stale node invocations as failed`)
    lgg.info(`marked ${stats.evolutionRuns} stale evolution runs as interrupted`)
    lgg.info(`set end_time for ${stats.evolutionRunsEndTimes} evolution runs missing end_time`)
    lgg.info(`marked ${stats.generations} stale generations as completed`)
    lgg.info(`deleted ${stats.messages} old messages (>24h)`)
    lgg.info("cleanup completed:", stats)

    return stats
  } catch (error) {
    lgg.error("cleanup failed:", error)
    throw error
  }
}
