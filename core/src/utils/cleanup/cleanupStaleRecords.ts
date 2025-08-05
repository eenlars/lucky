import { supabase } from "@core/utils/clients/supabase/client"
import { lgg } from "@core/utils/logging/Logger"

interface CleanupStats {
  workflowInvocations: number
  nodeInvocations: number
  evolutionRuns: number
  generations: number
  messages: number
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
      lgg.info(
        `marked ${stats.workflowInvocations} stale workflow invocations as failed`
      )
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
      lgg.info(
        `marked ${stats.nodeInvocations} stale node invocations as failed`
      )
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
      lgg.info(
        `marked ${stats.evolutionRuns} stale evolution runs as interrupted`
      )
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
