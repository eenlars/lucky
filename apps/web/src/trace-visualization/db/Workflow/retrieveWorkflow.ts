"use server"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { genShortId } from "@lucky/core/utils/common/utils"
import { lgg } from "@lucky/core/utils/logging/Logger"
import { type Tables, type TablesInsert, type TablesUpdate, genShortId } from "@lucky/shared/client"

export const retrieveWorkflowInvocation = async (invocationId: string): Promise<Tables<"WorkflowInvocation">> => {
  const supabase = await createRLSClient()
  const { data, error: WFInvocationError } = await supabase
    .from("WorkflowInvocation")
    .select("*")
    .eq("wf_invocation_id", invocationId)
    .single()

  if (WFInvocationError) {
    throw WFInvocationError
  }

  // Log sample data to help debug scoring issues
  if (data) {
    lgg.log("Retrieved single invocation with scores:", {
      id: data.wf_invocation_id,
      fitness: data.fitness,
    })
  }

  return data
}

export const retrieveWorkflowVersion = async (workflowVersionId: string): Promise<Tables<"WorkflowVersion">> => {
  const supabase = await createRLSClient()
  const { data, error: WFVersionError } = await supabase
    .from("WorkflowVersion")
    .select("*")
    .eq("wf_version_id", workflowVersionId)
    .single()

  if (WFVersionError) {
    throw WFVersionError
  }

  return data
}

export const ensureWorkflowExists = async (description: string, workflowId: string): Promise<void> => {
  const supabase = await createRLSClient()
  const workflowInsertable: TablesInsert<"Workflow"> = {
    wf_id: workflowId,
    description,
  }

  const { error } = await supabase.from("Workflow").upsert(workflowInsertable)

  if (error) {
    throw new Error(`Failed to upsert workflow: ${error.message}`)
  }
}

export const saveWorkflowVersion = async (data: {
  dsl: any
  commitMessage: string
  workflowId: string
  parentId?: string
  iterationBudget?: number
  timeBudgetSeconds?: number
}): Promise<Tables<"WorkflowVersion">> => {
  const supabase = await createRLSClient()
  const { dsl, commitMessage, workflowId, parentId, iterationBudget = 50, timeBudgetSeconds = 3600 } = data

  const insertData: TablesInsert<"WorkflowVersion"> = {
    wf_version_id: genShortId(),
    workflow_id: workflowId,
    dsl,
    commit_message: commitMessage,
    operation: "mutation",
    parent_id: parentId,
    iteration_budget: iterationBudget,
    time_budget_seconds: timeBudgetSeconds,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data: insertResult, error } = await supabase.from("WorkflowVersion").insert(insertData).select().single()

  if (error) {
    throw error
  }

  return insertResult
}

export interface WorkflowInvocationFilters {
  status?: "running" | "completed" | "failed" | "rolled_back"
  minCost?: number
  maxCost?: number
  dateFrom?: string
  dateTo?: string
  minAccuracy?: number
  maxAccuracy?: number
  minFitnessScore?: number
  maxFitnessScore?: number
}

export interface WorkflowInvocationSortOptions {
  field: "start_time" | "usd_cost" | "status" | "fitness" | "accuracy" | "duration"
  order: "asc" | "desc"
}

export interface WorkflowInvocationsResponse {
  data: Tables<"WorkflowInvocation">[]
  totalCount: number
}

export const retrieveWorkflowInvocations = async (
  page?: number,
  limit?: number,
  filters?: WorkflowInvocationFilters,
  sort?: WorkflowInvocationSortOptions,
): Promise<WorkflowInvocationsResponse> => {
  const supabase = await createRLSClient()
  // First, build the base query with count
  let query = supabase.from("WorkflowInvocation").select("*", { count: "exact" })

  // Apply filters
  if (filters) {
    if (filters.status) {
      query = query.eq("status", filters.status)
    }
    if (filters.minCost !== undefined) {
      query = query.gte("usd_cost", filters.minCost)
    }
    if (filters.maxCost !== undefined) {
      query = query.lte("usd_cost", filters.maxCost)
    }
    if (filters.dateFrom) {
      query = query.gte("start_time", filters.dateFrom)
    }
    if (filters.dateTo) {
      query = query.lte("start_time", filters.dateTo)
    }
    if (filters.minAccuracy !== undefined) {
      query = query.gte("accuracy", filters.minAccuracy)
    }
    if (filters.maxAccuracy !== undefined) {
      query = query.lte("accuracy", filters.maxAccuracy)
    }
    if (filters.minFitnessScore !== undefined) {
      query = query.gte("fitness_score", filters.minFitnessScore)
    }
    if (filters.maxFitnessScore !== undefined) {
      query = query.lte("fitness_score", filters.maxFitnessScore)
    }
  }

  // Apply sorting
  if (sort) {
    const ascending = sort.order === "asc"
    switch (sort.field) {
      case "start_time":
        query = query.order("start_time", { ascending })
        break
      case "usd_cost":
        query = query.order("usd_cost", { ascending })
        break
      case "status":
        query = query.order("status", { ascending })
        break
      case "fitness":
        // Handle NULL values properly - NULL fitness scores should always sort last
        query = query.order("fitness_score", {
          ascending,
          nullsFirst: false, // NULL values (failed invocations) always sort last
        })
        break
      case "accuracy":
        // Handle NULL values properly - NULL accuracy scores should always sort last
        query = query.order("accuracy", {
          ascending,
          nullsFirst: false, // NULL values (failed invocations) always sort last
        })
        break
      case "duration":
        // For duration sorting, we need to handle both completed and running workflows
        // Running workflows (no end_time) should be sorted by start_time
        // Completed workflows should be sorted by actual duration
        if (ascending) {
          query = query.order("end_time", {
            ascending: true,
            nullsFirst: false,
          })
        } else {
          query = query.order("end_time", {
            ascending: false,
            nullsFirst: true,
          })
        }
        break
      default: {
        const _exhaustiveCheck: never = sort.field
        void _exhaustiveCheck
        query = query.order("start_time", { ascending: false })
      }
    }
  } else {
    // Default sorting
    query = query.order("start_time", { ascending: false })
  }

  if (page !== undefined && limit !== undefined) {
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)
  }

  const { data, error: WFInvocationError, count } = await query

  if (WFInvocationError) {
    throw WFInvocationError
  }

  // For duration sorting, we need to post-process the data to calculate actual duration
  if (sort?.field === "duration" && data) {
    const processedData = data.map(item => ({
      ...item,
      duration: item.end_time ? new Date(item.end_time).getTime() - new Date(item.start_time).getTime() : null,
    }))

    // Sort by calculated duration, handling null values appropriately
    processedData.sort((a, b) => {
      if (a.duration === null && b.duration === null) return 0
      if (a.duration === null) return sort.order === "asc" ? 1 : -1
      if (b.duration === null) return sort.order === "asc" ? -1 : 1

      return sort.order === "asc" ? a.duration - b.duration : b.duration - a.duration
    })

    return {
      data: processedData,
      totalCount: count ?? 0,
    }
  }

  return {
    data: data ?? [],
    totalCount: count ?? 0,
  }
}

export const retrieveLatestWorkflowVersions = async (limit?: number): Promise<Tables<"WorkflowVersion">[]> => {
  const supabase = await createRLSClient()
  let query = supabase.from("WorkflowVersion").select("*").order("created_at", { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error: WFVersionError } = await query

  if (WFVersionError) {
    throw WFVersionError
  }

  return data
}

export const deleteWorkflowInvocations = async (invocationIds: string[]): Promise<number> => {
  const supabase = await createRLSClient()
  const { error } = await supabase.from("WorkflowInvocation").delete().in("wf_invocation_id", invocationIds)

  if (error) throw error

  return invocationIds.length
}

/**
 * Mark stale workflow invocations as failed
 * A workflow invocation is considered stale if it's been running for more than 10 minutes
 * This more aggressive cleanup prevents false "running" status display
 */
export const cleanupStaleWorkflowInvocations = async (): Promise<number> => {
  const supabase = await createRLSClient()
  const staleThresholdMinutes = 10 // Reduced from 2 hours to 10 minutes
  const staleThresholdMs = staleThresholdMinutes * 60 * 1000
  const cutoffTime = new Date(Date.now() - staleThresholdMs).toISOString()

  const insertable: TablesUpdate<"WorkflowInvocation"> = {
    status: "failed",
    end_time: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("WorkflowInvocation")
    .update(insertable)
    .eq("status", "running")
    .lt("start_time", cutoffTime)
    .select("wf_invocation_id")

  if (error) throw error

  // Log cleanup activity if any records were updated
  if (data && data.length > 0) {
    console.log(
      `Cleaned up ${data.length} stale workflow invocations:`,
      data.map(d => d.wf_invocation_id),
    )
  }

  return data.length
}
