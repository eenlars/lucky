"use server"

import { createRLSClient } from "@/lib/supabase/server-rls"
import {
  type MessageMetadata,
  type NodeGroup,
  type NodeInvocationExtended,
  groupInvocationsByNode,
  normalizeNodeInvocation,
} from "./utils"

export type { MessageMetadata, NodeGroup, NodeInvocationExtended }

export interface NodeInvocationsResult {
  nodeInvocations: NodeInvocationExtended[]
  groups: NodeGroup[]
}

/**
 * Fetch node invocations for a workflow with optimized query.
 * Only fetches essential Message fields to avoid timeouts on large payloads.
 */
export async function nodeInvocations(workflowInvocationId: string): Promise<NodeInvocationsResult> {
  const supabase = await createRLSClient()
  const { data: invocations, error } = await supabase
    .from("NodeInvocation")
    .select(
      `
        *,
        NodeVersion(*),
        inputs:Message!Message_target_invocation_id_fkey(
          msg_id,
          role,
          origin_invocation_id,
          target_invocation_id,
          from_node_id,
          created_at,
          payload
        ),
        outputs:Message!Message_origin_invocation_id_fkey(
          msg_id,
          role,
          origin_invocation_id,
          target_invocation_id,
          from_node_id,
          created_at,
          payload
        )
      `,
    )
    .eq("wf_invocation_id", workflowInvocationId)
    .order("start_time")
    .limit(1000)

  if (error) {
    console.error("Failed to fetch node invocations:", error)
    throw new Error("Failed to fetch node invocations")
  }

  const nodeInvocations: NodeInvocationExtended[] = (invocations ?? [])
    .map(normalizeNodeInvocation)
    .filter((inv): inv is NodeInvocationExtended => inv !== null)

  const groups = groupInvocationsByNode(nodeInvocations)

  return {
    nodeInvocations,
    groups,
  }
}
