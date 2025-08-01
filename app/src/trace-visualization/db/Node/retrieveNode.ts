"use server"
import { supabase } from "@/core/utils/clients/supabase/client"
import type { TablesUpdate } from "@/core/utils/clients/supabase/types"

export const retrieveNodeInvocations = async (workflowInvocationId: string) => {
  const { data, error: nodeInvocationError } = await supabase
    .from("NodeInvocation")
    .select("*")
    .eq("wf_invocation_id", workflowInvocationId)
    .order("start_time", { ascending: true })

  if (nodeInvocationError) {
    throw nodeInvocationError
  }

  return data
}

export const retrieveNode = async (nodeId: string) => {
  const { data, error: nodeError } = await supabase
    .from("NodeVersion")
    .select("*")
    .eq("node_id", nodeId)
    .single()

  if (nodeError) {
    throw nodeError
  }

  return data
}

export const retrieveNodeDefinitions = async (workflowVersionId: string) => {
  const { data, error: nodeDefinitionError } = await supabase
    .from("NodeVersion")
    .select("*")
    .eq("wf_version_id", workflowVersionId)

  if (nodeDefinitionError) {
    throw nodeDefinitionError
  }

  return data
}

/**
 * Mark stale node invocations as failed
 * A node invocation is considered stale if it's been running for more than 2 hours
 */
export const cleanupStaleNodeInvocations = async () => {
  const staleThresholdHours = 2
  const staleThresholdMs = staleThresholdHours * 60 * 60 * 1000
  const cutoffTime = new Date(Date.now() - staleThresholdMs).toISOString()

  const insertable: TablesUpdate<"NodeInvocation"> = {
    status: "failed",
    end_time: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("NodeInvocation")
    .update(insertable)
    .eq("status", "running")
    .lt("start_time", cutoffTime)
    .select("node_invocation_id")

  if (error) throw error

  return data
}
