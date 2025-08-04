import { supabase } from "@/utils/clients/supabase/client"

export interface NodeInvocationSummary {
  node_invocation_id: string
  node_id: string
  start_time: string
  end_time: string | null
  summary: string | null
  usd_cost: number | null
  status: string | null
}

/**
 * Retrieves node invocation summaries for a specific workflow invocation and optionally a specific node.
 * @param workflowInvocationId - The workflow invocation ID
 * @param nodeId - Optional specific node ID. If not provided, returns summaries for all nodes.
 * @returns Array of node invocation summaries ordered by start time
 */
export async function retrieveNodeInvocationSummaries(
  workflowInvocationId: string,
  nodeId?: string
): Promise<NodeInvocationSummary[]> {
  let query = supabase
    .from("NodeInvocation")
    .select(
      "node_invocation_id, node_id, start_time, end_time, summary, usd_cost, status"
    )
    .eq("wf_invocation_id", workflowInvocationId)

  if (nodeId) {
    query = query.eq("node_id", nodeId)
  }

  const { data, error } = await query.order("start_time", { ascending: true })

  if (error) throw error

  return data || []
}

/**
 * Retrieves all node summaries for a workflow invocation, grouped by node ID.
 * @param workflowInvocationId - The workflow invocation ID
 * @returns Map of node ID to array of summaries
 */
export async function retrieveNodeSummariesGrouped(
  workflowInvocationId: string
): Promise<Map<string, NodeInvocationSummary[]>> {
  const summaries = await retrieveNodeInvocationSummaries(workflowInvocationId)

  const grouped = new Map<string, NodeInvocationSummary[]>()
  for (const summary of summaries) {
    const nodeId = summary.node_id
    if (!grouped.has(nodeId)) {
      grouped.set(nodeId, [])
    }
    grouped.get(nodeId)!.push(summary)
  }

  return grouped
}
