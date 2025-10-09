import { queryKeys } from "@/lib/query-keys"
import { basicWorkflow } from "@/trace-visualization/db/Workflow/basicWorkflow"
import type { NodeInvocationExtended } from "@/trace-visualization/db/Workflow/nodeInvocations"
import { fetchWithRetry } from "@/utils/fetch-with-retry"
import type { Tables } from "@lucky/shared/client"
import { useQuery } from "@tanstack/react-query"

interface TraceData {
  workflowInvocation: Tables<"WorkflowInvocation">
  workflowVersion: Tables<"WorkflowVersion">
  workflow: Tables<"Workflow">
  nodeInvocations: NodeInvocationExtended[]
}

/**
 * Hook to fetch trace data for a workflow invocation
 * Includes workflow, version, and node invocation details
 * Auto-refreshes for running workflows
 */
export function useTraceQuery(wfInvocationId: string) {
  return useQuery({
    queryKey: queryKeys.invocations.detail(wfInvocationId),
    queryFn: async (): Promise<TraceData> => {
      // Fetch basic workflow info
      const basic = await basicWorkflow(wfInvocationId)
      if (!basic) {
        throw new Error("Trace not found")
      }
      const { workflowInvocation, workflowVersion, workflow } = basic

      // Fetch detailed node invocations
      const res = await fetchWithRetry(`/api/trace/${wfInvocationId}/node-invocations`, {
        cache: "no-store",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || "Failed to fetch node invocations")
      }
      const { nodeInvocations } = (await res.json()) as {
        nodeInvocations: NodeInvocationExtended[]
      }

      return {
        workflowInvocation,
        workflowVersion,
        workflow,
        nodeInvocations,
      }
    },
    staleTime: 10_000, // 10 seconds
    // Auto-refresh for running workflows
    refetchInterval: query => {
      const data = query.state.data
      if (!data) return false
      const isRunning = data.workflowInvocation.status === "running" || !data.workflowInvocation.end_time
      return isRunning ? 10000 : false // Refresh every 10s for running workflows
    },
  })
}
