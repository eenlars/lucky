import { queryKeys } from "@/lib/query-keys"
import { useMutation, useQueryClient } from "@tanstack/react-query"

/**
 * Mutation hook to delete workflow invocations
 */
export function useDeleteInvocations() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await fetch("/api/workflow/invocations", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete invocations")
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate all invocation queries
      queryClient.invalidateQueries({ queryKey: queryKeys.invocations.all })
    },
  })
}

/**
 * Mutation hook to invoke a workflow
 */
export function useInvokeWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      workflowVersionId,
      evalInput,
    }: {
      workflowVersionId: string
      evalInput: {
        type: string
        workflowId: string
        goal: string
      }
    }) => {
      const response = await fetch("/api/workflow/invoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workflowVersionId,
          evalInput,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to run workflow")
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      // Invalidate invocations list to show new invocation
      queryClient.invalidateQueries({ queryKey: queryKeys.invocations.lists() })
      // Also invalidate the workflow version (updates last run info if tracked)
      queryClient.invalidateQueries({
        queryKey: queryKeys.workflowVersions.detail(variables.workflowVersionId),
      })
    },
  })
}
