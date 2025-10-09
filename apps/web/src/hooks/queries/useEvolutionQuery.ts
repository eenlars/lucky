import type { Database } from "@lucky/shared/client"
import { useQuery } from "@tanstack/react-query"

type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]

export interface WorkflowInvocationSubset {
  wf_invocation_id: string
  wf_version_id: string
  start_time: string
  end_time: string | null
  status: "running" | "completed" | "failed" | "rolled_back"
  usd_cost: number
  fitness: number | null
  accuracy: number | null
  run_id: string | null
  generation_id: string | null
}

export interface GenerationWithData {
  generation: Tables<"Generation">
  versions: Tables<"WorkflowVersion">[]
  invocations: WorkflowInvocationSubset[]
}

export function useEvolutionRun(runId: string) {
  return useQuery({
    queryKey: ["evolution-run", runId],
    queryFn: async () => {
      // Clean up stale runs first
      await fetch("/api/evolution-runs/cleanup", { method: "POST" })

      const response = await fetch(`/api/evolution/${runId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch evolution run: ${response.statusText}`)
      }

      return response.json() as Promise<Tables<"EvolutionRun">>
    },
  })
}

export function useGenerationsData(runId: string, enabled = true) {
  return useQuery({
    queryKey: ["evolution-generations", runId],
    queryFn: async () => {
      const response = await fetch(`/api/evolution/${runId}/generations`)
      if (!response.ok) {
        throw new Error(`Failed to fetch generations: ${response.statusText}`)
      }

      return response.json() as Promise<GenerationWithData[]>
    },
    enabled,
    refetchInterval: query => {
      // Auto-refresh every 30s if the run is still active
      const evolutionRun = query.state.data
      return evolutionRun ? 30000 : false
    },
  })
}

export function useWorkflowVersion(versionId: string | null) {
  return useQuery({
    queryKey: ["workflow-version", versionId],
    queryFn: async () => {
      if (!versionId) throw new Error("No version ID provided")

      const response = await fetch(`/api/workflow/version/${versionId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch workflow version: ${response.statusText}`)
      }

      return response.json() as Promise<Tables<"WorkflowVersion">>
    },
    enabled: !!versionId,
    staleTime: Number.POSITIVE_INFINITY, // Workflow versions are immutable
  })
}
