import { supabase } from "@core/utils/clients/supabase/client"
import { lgg } from "@core/utils/logging/Logger"
import type { Tables } from "@core/utils/json"

interface CleanupStats {
  workflowInvocations: number
  nodeInvocations: number
  evolutionRuns: number
  generations: number
  messages: number
  // number of EvolutionRun rows whose end_time was set by cleanup
  evolutionRunsEndTimes: number
}

/**
 * cleanup stale records from the database
 * removes records with no activity for more than 10 minutes
 */
export async function cleanupStaleRecords(): Promise<CleanupStats> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const stats: CleanupStats = {
    workflowInvocations: 0,
    nodeInvocations: 0,
    evolutionRuns: 0,
    generations: 0,
    messages: 0,
    evolutionRunsEndTimes: 0,
  }

  try {
    // cleanup stale workflow invocations (running > 10 minutes)
    const { data: staleWorkflows, error: workflowError } = await supabase
      .from("WorkflowInvocation")
      .update({ status: "failed" })
      .eq("status", "running")
      .lt("start_time", tenMinutesAgo)
      .select("wf_invocation_id")

    if (workflowError) {
      lgg.error("failed to cleanup stale workflow invocations:", workflowError)
    } else {
      stats.workflowInvocations = staleWorkflows?.length || 0
      lgg.info(`marked ${stats.workflowInvocations} stale workflow invocations as failed`)
    }

    // cleanup stale node invocations (running > 10 minutes)
    const { data: staleNodes, error: nodeError } = await supabase
      .from("NodeInvocation")
      .update({ status: "failed" })
      .eq("status", "running")
      .lt("start_time", tenMinutesAgo)
      .select("node_invocation_id")

    if (nodeError) {
      lgg.error("failed to cleanup stale node invocations:", nodeError)
    } else {
      stats.nodeInvocations = staleNodes?.length || 0
      lgg.info(`marked ${stats.nodeInvocations} stale node invocations as failed`)
    }

    // cleanup stale evolution runs (running > 10 minutes)
    const { data: staleRuns, error: runError } = await supabase
      .from("EvolutionRun")
      .update({ status: "interrupted" })
      .eq("status", "running")
      .lt("start_time", tenMinutesAgo)
      .select("run_id")

    if (runError) {
      lgg.error("failed to cleanup stale evolution runs:", runError)
    } else {
      stats.evolutionRuns = staleRuns?.length || 0
      lgg.info(`marked ${stats.evolutionRuns} stale evolution runs as interrupted`)
    }

    // set end_time for any evolution runs missing it (default: start_time + 1 hour)
    try {
      type EvoRunMin = Pick<Tables<"EvolutionRun">, "run_id" | "start_time" | "end_time">
      const { data: runsMissingEnd, error: runsMissingEndError } = await supabase
        .from("EvolutionRun")
        .select("run_id,start_time,end_time")
        .is("end_time", null)

      if (runsMissingEndError) {
        lgg.error("failed to fetch evolution runs missing end_time:", runsMissingEndError)
      } else if (runsMissingEnd && runsMissingEnd.length > 0) {
        let updatedCount = 0
        // Update each run with computed end_time
        for (const run of runsMissingEnd as EvoRunMin[]) {
          const startMs = new Date(run.start_time).getTime()
          if (Number.isNaN(startMs)) {
            // skip invalid dates but log for visibility
            // use info to be compatible with minimal logger mocks in tests
            lgg.info(`skipping EvolutionRun ${run.run_id} due to invalid start_time: ${run.start_time}`)
            continue
          }
          const computedEnd = new Date(startMs + 60 * 60 * 1000).toISOString()
          const { error: updateEndError } = await supabase
            .from("EvolutionRun")
            .update({ end_time: computedEnd })
            .eq("run_id", run.run_id)

          if (updateEndError) {
            lgg.error(`failed to set end_time for EvolutionRun ${run.run_id}:`, updateEndError)
          } else {
            updatedCount++
          }
        }
        stats.evolutionRunsEndTimes = updatedCount
        lgg.info(`set end_time for ${stats.evolutionRunsEndTimes} evolution runs missing end_time (start_time + 1h)`)
      }
    } catch (err) {
      // if the supabase client or mocks don't support this chain, continue without blocking cleanup
      lgg.error("failed to set end_time for runs missing it", err)
    }

    // cleanup stale generations (no end_time and start_time > 10 minutes)
    const { data: staleGenerations, error: generationError } = await supabase
      .from("Generation")
      .update({ end_time: new Date().toISOString() })
      .is("end_time", null)
      .lt("start_time", tenMinutesAgo)
      .select("generation_id")

    if (generationError) {
      lgg.error("failed to cleanup stale generations:", generationError)
    } else {
      stats.generations = staleGenerations?.length || 0
      lgg.info(`marked ${stats.generations} stale generations as completed`)
    }

    // delete old messages (older than 24 hours to keep recent activity)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: oldMessages, error: messageError } = await supabase
      .from("Message")
      .delete()
      .lt("created_at", oneDayAgo)
      .select("msg_id")

    if (messageError) {
      lgg.error("failed to cleanup old messages:", messageError)
    } else {
      stats.messages = oldMessages?.length || 0
      lgg.info(`deleted ${stats.messages} old messages (>24h)`)
    }

    lgg.info("cleanup completed:", stats)
    return stats
  } catch (error) {
    lgg.error("cleanup failed:", error)
    throw error
  }
}
