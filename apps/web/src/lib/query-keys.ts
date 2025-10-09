/**
 * Query key factory for TanStack Query
 * Provides type-safe, consistent query keys across the application
 */

export const queryKeys = {
  // Workflows
  workflows: {
    all: ["workflows"] as const,
    lists: () => [...queryKeys.workflows.all, "list"] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.workflows.lists(), filters] as const,
    details: () => [...queryKeys.workflows.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.workflows.details(), id] as const,
  },

  // Workflow Versions
  workflowVersions: {
    all: ["workflowVersions"] as const,
    detail: (versionId: string) => [...queryKeys.workflowVersions.all, versionId] as const,
  },

  // Workflow Invocations
  invocations: {
    all: ["invocations"] as const,
    lists: () => [...queryKeys.invocations.all, "list"] as const,
    list: (filters?: {
      page?: number
      pageSize?: number
      status?: string | string[]
      sortField?: string
      sortOrder?: "asc" | "desc"
      [key: string]: unknown
    }) => [...queryKeys.invocations.lists(), filters] as const,
    details: () => [...queryKeys.invocations.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.invocations.details(), id] as const,
  },

  // Evolution runs
  evolution: {
    all: ["evolution"] as const,
    detail: (runId: string) => [...queryKeys.evolution.all, runId] as const,
    trace: (runId: string) => [...queryKeys.evolution.all, runId, "trace"] as const,
  },

  // Structures
  structures: {
    all: ["structures"] as const,
    lists: () => [...queryKeys.structures.all, "list"] as const,
  },
}
