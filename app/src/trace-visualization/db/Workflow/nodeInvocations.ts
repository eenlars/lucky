"use server"
import { supabase } from "@core/utils/clients/supabase/client"
import { cache } from "react"
import { groupInvocationsByNode, NodeGroup, NodeInvocationExtended, normalizeNodeInvocation } from "./utils"

export type { NodeGroup, NodeInvocationExtended }

export interface NodeInvocationsResult {
  nodeInvocations: NodeInvocationExtended[]
  groups: NodeGroup[]
}

export const nodeInvocations = cache(async (workflowInvocationId: string): Promise<NodeInvocationsResult> => {
  const { data: invocations, error } = await supabase
    .from("NodeInvocation")
    .select(
      `
        *,
        NodeVersion ( * ),
        inputs:Message!Message_target_invocation_id_fkey ( * ),
        outputs:Message!Message_origin_invocation_id_fkey ( * )
      `
    )
    .eq("wf_invocation_id", workflowInvocationId)
    .order("start_time")

  if (error) {
    console.error(error)
    throw new Error("Failed to fetch node invocations")
  }

  const nodeInvocations: NodeInvocationExtended[] = (invocations ?? []).map(normalizeNodeInvocation)

  const groups = groupInvocationsByNode(nodeInvocations)

  return {
    nodeInvocations,
    groups,
  }
})
