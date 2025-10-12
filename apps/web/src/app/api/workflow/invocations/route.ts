import { requireAuth } from "@/lib/api-auth"
import { logException } from "@/lib/error-logger"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

type WorkflowStatus = "running" | "completed" | "failed" | "rolled_back"

interface WorkflowInvocationFilters {
  status?: WorkflowStatus | WorkflowStatus[]
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

// Allowed columns for sorting to prevent SQL injection and runtime errors
const ALLOWED_SORT_FIELDS = [
  "start_time",
  "end_time",
  "status",
  "usd_cost",
  "accuracy",
  "fitness",
  "run_id",
  "generation_id",
  "wf_version_id",
] as const

type AllowedSortField = (typeof ALLOWED_SORT_FIELDS)[number]

interface WorkflowInvocationSortOptions {
  field: AllowedSortField
  order: "asc" | "desc"
}

export async function GET(request: NextRequest) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  const supabase = await createRLSClient()
  const searchParams = request.nextUrl.searchParams
  const page = Number.parseInt(searchParams.get("page") || "1", 10)
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "20", 10)

  let filters: WorkflowInvocationFilters = {}
  let sort: WorkflowInvocationSortOptions = {
    field: "start_time",
    order: "desc",
  }

  try {
    filters = JSON.parse(searchParams.get("filters") || "{}")
  } catch {
    // Use default empty filters if parsing fails
    filters = {}
  }

  try {
    const sortParam = JSON.parse(searchParams.get("sort") || '{"field": "start_time", "order": "desc"}')

    // Validate sort field against whitelist
    const field = ALLOWED_SORT_FIELDS.includes(sortParam.field) ? sortParam.field : "start_time"

    const order = sortParam.order === "asc" ? "asc" : "desc"

    sort = { field, order }
  } catch {
    // Use default sort if parsing fails
    sort = { field: "start_time", order: "desc" }
  }

  try {
    let query = supabase.from("WorkflowInvocation").select(
      `
      *,
      WorkflowVersion!inner(
        wf_version_id,
        Workflow!inner(
          wf_id,
          description
        )
      )
    `,
      { count: "exact" },
    )

    // Apply filters
    if (filters.status) {
      if (typeof filters.status === "string") {
        query = query.eq("status", filters.status)
      } else if (Array.isArray(filters.status) && filters.status.length > 0) {
        query = query.in("status", filters.status)
      }
    }
    if (filters.runId) {
      query = query.eq("run_id", filters.runId)
    }
    if (filters.generationId) {
      query = query.eq("generation_id", filters.generationId)
    }
    if (filters.wfVersionId) {
      query = query.eq("wf_version_id", filters.wfVersionId)
    }
    if (filters.dateRange) {
      query = query.gte("start_time", filters.dateRange.start).lte("start_time", filters.dateRange.end)
    }
    if (filters.dateFrom) {
      query = query.gte("start_time", filters.dateFrom)
    }
    if (filters.dateTo) {
      query = query.lte("start_time", filters.dateTo)
    }
    if (filters.minCost !== undefined) {
      query = query.gte("usd_cost", filters.minCost)
    }
    if (filters.maxCost !== undefined) {
      query = query.lte("usd_cost", filters.maxCost)
    }
    if (filters.minAccuracy !== undefined) {
      query = query.gte("accuracy", filters.minAccuracy)
    }
    if (filters.maxAccuracy !== undefined) {
      query = query.lte("accuracy", filters.maxAccuracy)
    }
    if (filters.minFitness !== undefined) {
      query = query.gte("fitness", filters.minFitness)
    }
    if (filters.maxFitness !== undefined) {
      query = query.lte("fitness", filters.maxFitness)
    }
    if (filters.hasFitnessScore === true) {
      query = query.not("fitness", "is", null)
    }
    if (filters.hasFitnessScore === false) {
      query = query.is("fitness", null)
    }
    if (filters.hasAccuracy === true) {
      query = query.not("accuracy", "is", null)
    }
    if (filters.hasAccuracy === false) {
      query = query.is("accuracy", null)
    }

    // Apply sorting
    query = query.order(sort.field, { ascending: sort.order === "asc" })

    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Compute aggregate statistics for the entire filtered dataset
    let aggregateQuery = supabase.from("WorkflowInvocation").select(
      `
      usd_cost,
      status,
      WorkflowVersion!inner(
        wf_version_id,
        Workflow!inner(
          wf_id
        )
      )
    `,
      { count: "exact" },
    )

    // Apply the same filters to the aggregate query
    if (filters.status) {
      if (typeof filters.status === "string") {
        aggregateQuery = aggregateQuery.eq("status", filters.status)
      } else if (Array.isArray(filters.status) && filters.status.length > 0) {
        aggregateQuery = aggregateQuery.in("status", filters.status)
      }
    }
    if (filters.runId) {
      aggregateQuery = aggregateQuery.eq("run_id", filters.runId)
    }
    if (filters.generationId) {
      aggregateQuery = aggregateQuery.eq("generation_id", filters.generationId)
    }
    if (filters.wfVersionId) {
      aggregateQuery = aggregateQuery.eq("wf_version_id", filters.wfVersionId)
    }
    if (filters.dateRange) {
      aggregateQuery = aggregateQuery
        .gte("start_time", filters.dateRange.start)
        .lte("start_time", filters.dateRange.end)
    }
    if (filters.dateFrom) {
      aggregateQuery = aggregateQuery.gte("start_time", filters.dateFrom)
    }
    if (filters.dateTo) {
      aggregateQuery = aggregateQuery.lte("start_time", filters.dateTo)
    }
    if (filters.minCost !== undefined) {
      aggregateQuery = aggregateQuery.gte("usd_cost", filters.minCost)
    }
    if (filters.maxCost !== undefined) {
      aggregateQuery = aggregateQuery.lte("usd_cost", filters.maxCost)
    }
    if (filters.minAccuracy !== undefined) {
      aggregateQuery = aggregateQuery.gte("accuracy", filters.minAccuracy)
    }
    if (filters.maxAccuracy !== undefined) {
      aggregateQuery = aggregateQuery.lte("accuracy", filters.maxAccuracy)
    }
    if (filters.minFitness !== undefined) {
      aggregateQuery = aggregateQuery.gte("fitness", filters.minFitness)
    }
    if (filters.maxFitness !== undefined) {
      aggregateQuery = aggregateQuery.lte("fitness", filters.maxFitness)
    }
    if (filters.hasFitnessScore === true) {
      aggregateQuery = aggregateQuery.not("fitness", "is", null)
    }
    if (filters.hasFitnessScore === false) {
      aggregateQuery = aggregateQuery.is("fitness", null)
    }
    if (filters.hasAccuracy === true) {
      aggregateQuery = aggregateQuery.not("accuracy", "is", null)
    }
    if (filters.hasAccuracy === false) {
      aggregateQuery = aggregateQuery.is("accuracy", null)
    }

    const { data: aggregateData, error: aggregateError } = await aggregateQuery

    if (aggregateError) {
      console.error("Error fetching aggregate data:", aggregateError)
      // Don't fail the request if aggregates fail, just return empty aggregates
    }

    // Compute aggregates from the data
    const aggregates = (() => {
      const totalSpent = aggregateData?.reduce((sum, inv) => sum + inv.usd_cost, 0) || 0
      const failedCount = aggregateData?.filter(inv => inv.status === "failed").length || 0
      // Note: accuracy is not available in WorkflowInvocation table directly
      // It would require joining with WorkflowInvocationEval table
      // For now, setting to null as it's an optional metric
      const avgAccuracy = null

      return { totalSpent, avgAccuracy, failedCount }
    })()

    return NextResponse.json({
      data: data || [],
      totalCount: count || 0,
      page,
      pageSize,
      aggregates,
    })
  } catch (error) {
    logException(error, {
      location: "/api/workflow/invocations/GET",
      env: process.env.NODE_ENV === "production" ? "production" : "development",
    })
    console.error("Error fetching workflow invocations:", error)
    return NextResponse.json({ error: "Failed to fetch invocations" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  const supabase = await createRLSClient()

  try {
    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No invocation IDs provided" }, { status: 400 })
    }

    const { error } = await supabase.from("WorkflowInvocation").delete().in("wf_invocation_id", ids)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, deletedCount: ids.length })
  } catch (error) {
    logException(error, {
      location: "/api/workflow/invocations/DELETE",
      env: process.env.NODE_ENV === "production" ? "production" : "development",
    })
    console.error("Error deleting workflow invocations:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete invocations",
      },
      { status: 500 },
    )
  }
}
