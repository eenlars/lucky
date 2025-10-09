import { queryKeys } from "@/lib/query-keys"
import { useQuery } from "@tanstack/react-query"

/**
 * Hook to fetch a workflow version by version ID
 * Safe for use with optional IDs - query is disabled when ID is undefined
 */
export function useWorkflowVersionQuery(versionId: string | undefined) {
  return useQuery({
    queryKey: versionId ? queryKeys.workflowVersions.detail(versionId) : ["workflowVersions", "detail", null],
    queryFn: async () => {
      if (!versionId) throw new Error("Version ID is required")
      const response = await fetch(`/api/workflow/version/${versionId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch workflow version")
      }
      return response.json()
    },
    enabled: !!versionId,
    staleTime: 120_000, // Version details rarely change, cache for 2 min
  })
}
