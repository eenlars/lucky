import type { Database } from "@lucky/shared/client"

type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]

export type WorkflowInvocationWithScores = Tables<"WorkflowInvocation"> & {
  accuracy?: number | null
  fitness_score?: number | null
  WorkflowVersion?: {
    wf_version_id: string
    Workflow?: {
      wf_id: string
      description: string
    }
  }
}

export interface WorkflowInvocationFilters {
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
  minFitness?: number
  maxFitness?: number
}

export interface WorkflowInvocationSortOptions {
  field: string
  order: "asc" | "desc"
}

export type SortField = "start_time" | "usd_cost" | "status" | "fitness" | "accuracy" | "duration"
export type SortOrder = "asc" | "desc"

export interface FilterState {
  status: string
  minCost: string
  maxCost: string
  dateFrom: string
  dateTo: string
  minAccuracy: string
  maxAccuracy: string
  minFitnessScore: string
  maxFitnessScore: string
}
