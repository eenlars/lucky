import { queryKeys } from "@/lib/query-keys"
import { createWorkflow, deleteWorkflow, saveWorkflowVersion, updateWorkflowDescription } from "@/lib/workflows"
import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import { useMutation, useQueryClient } from "@tanstack/react-query"

/**
 * Mutation hook to create a new workflow
 */
export function useCreateWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      description,
      dsl,
      commitMessage,
    }: {
      description: string
      dsl: WorkflowConfig
      commitMessage: string
    }) => createWorkflow(description, dsl, commitMessage),
    onSuccess: () => {
      // Invalidate and refetch workflows list
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.lists() })
    },
  })
}

/**
 * Mutation hook to save a new workflow version
 */
export function useSaveWorkflowVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      workflowId,
      dsl,
      commitMessage,
      parentVersionId,
    }: {
      workflowId: string
      dsl: WorkflowConfig
      commitMessage: string
      parentVersionId?: string
    }) => saveWorkflowVersion(workflowId, dsl, commitMessage, parentVersionId),
    onSuccess: (_, variables) => {
      // Invalidate the specific workflow and lists
      queryClient.invalidateQueries({
        queryKey: queryKeys.workflows.detail(variables.workflowId),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.lists() })
    },
  })
}

/**
 * Mutation hook to update workflow description
 */
export function useUpdateWorkflowDescription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      workflowId,
      description,
    }: {
      workflowId: string
      description: string
    }) => updateWorkflowDescription(workflowId, description),
    onSuccess: (_, variables) => {
      // Invalidate the specific workflow and lists
      queryClient.invalidateQueries({
        queryKey: queryKeys.workflows.detail(variables.workflowId),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.lists() })
    },
  })
}

/**
 * Mutation hook to delete a workflow with optimistic updates
 */
export function useDeleteWorkflow(options?: { onError?: (error: Error) => void }) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (workflowId: string) => deleteWorkflow(workflowId),
    onMutate: async workflowId => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.workflows.lists() })

      // Snapshot previous value
      const previousWorkflows = queryClient.getQueryData(queryKeys.workflows.lists())

      // Optimistically update to filter out the deleted workflow
      queryClient.setQueryData(queryKeys.workflows.lists(), (old: any) => {
        if (!old) return old
        return old.filter((w: any) => w.wf_id !== workflowId)
      })

      return { previousWorkflows }
    },
    onError: (err, workflowId, context) => {
      // Rollback on error
      if (context?.previousWorkflows) {
        queryClient.setQueryData(queryKeys.workflows.lists(), context.previousWorkflows)
      }
      // Call custom error handler if provided
      options?.onError?.(err as Error)
    },
    onSettled: (_, __, workflowId) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: queryKeys.workflows.detail(workflowId),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.lists() })
    },
  })
}
