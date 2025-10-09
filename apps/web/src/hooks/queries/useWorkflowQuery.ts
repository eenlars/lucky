import { queryKeys } from "@/lib/query-keys"
import { getWorkflow } from "@/lib/workflows"
import { useQuery } from "@tanstack/react-query"

/**
 * Hook to fetch a single workflow by ID
 * Safe for use with optional IDs - query is disabled when ID is undefined
 */
export function useWorkflowQuery(workflowId: string | undefined) {
  return useQuery({
    queryKey: workflowId ? queryKeys.workflows.detail(workflowId) : ["workflows", "detail", "disabled"],
    queryFn: async () => {
      if (!workflowId) throw new Error("Workflow ID is required")
      return getWorkflow(workflowId)
    },
    enabled: !!workflowId,
    staleTime: 60_000,
  })
}
