import { queryKeys } from "@/lib/query-keys"
import type { Database } from "@lucky/shared/client"
import { useQuery } from "@tanstack/react-query"

type WorkflowInvocationWithScores = Database["public"]["Tables"]["WorkflowInvocation"]["Row"] & {
  accuracy?: number | null
  fitness_score?: number | null
}

interface WorkflowInvocationFilters {
  status?: string | string[]
  runId?: string
  generationId?: string
  wfVersionId?: string
  dateRange?: {
    start: string
    end: string
  }
  dateFrom?: string
  dateTo?: string
  hasFitnessScore?: boolean
  hasAccuracy?: boolean
  minCost?: number
  maxCost?: number
  minAccuracy?: number
  maxAccuracy?: number
  minFitnessScore?: number
  maxFitnessScore?: number
}

interface WorkflowInvocationSortOptions {
  field: string
  order: "asc" | "desc"
}

interface UseInvocationsQueryOptions {
  page?: number
  pageSize?: number
  filters?: WorkflowInvocationFilters
  sortField?: string
  sortOrder?: "asc" | "desc"
  refetchInterval?: number | false
}

/**
 * Hook to fetch workflow invocations with pagination, filtering, and sorting
 * Supports auto-refresh for monitoring running invocations
 */
export function useInvocationsQuery({
  page = 1,
  pageSize = 25,
  filters = {},
  sortField = "start_time",
  sortOrder = "desc",
  refetchInterval = false,
}: UseInvocationsQueryOptions = {}) {
  const sortParams: WorkflowInvocationSortOptions = {
    field: sortField,
    order: sortOrder,
  }

  return useQuery({
    queryKey: queryKeys.invocations.list({
      page,
      pageSize,
      ...filters,
      sortField,
      sortOrder,
    }),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        filters: JSON.stringify(filters),
        sort: JSON.stringify(sortParams),
      })

      const response = await fetch(`/api/workflow/invocations?${params}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch invocations: ${response.statusText}`)
      }

      const result = await response.json()
      return {
        data: result.data as WorkflowInvocationWithScores[],
        totalCount: result.totalCount as number,
      }
    },
    staleTime: 10_000, // 10 seconds
    refetchInterval, // Pass through for auto-refresh
  })
}

/**
 * Hook to fetch a single invocation by ID
 * Safe for use with optional IDs - query is disabled when ID is undefined
 */
export function useInvocationQuery(invocationId: string | undefined) {
  return useQuery({
    queryKey: invocationId ? queryKeys.invocations.detail(invocationId) : ["invocations", "detail", "disabled"],
    queryFn: async () => {
      if (!invocationId) throw new Error("Invocation ID is required")
      const response = await fetch(`/api/workflow/invocations/${invocationId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch invocation")
      }
      return response.json()
    },
    enabled: !!invocationId,
    staleTime: 30_000,
  })
}
