import { requireAuth } from "@/lib/api-auth"
import { logException } from "@/lib/error-logger"
import { getWorkflowState } from "@/lib/redis/workflow-state"
import { type NextRequest, NextResponse } from "next/server"
import { activeWorkflows } from "../../invoke/route"

/**
 * Workflow execution state
 */
type WorkflowState = "running" | "cancelling" | "cancelled" | "completed" | "failed" | "not_found"

interface WorkflowStatusResponse {
  state: WorkflowState
  invocationId: string
  createdAt?: number
  cancelRequestedAt?: number
}

/**
 * GET /api/workflow/status/:invocationId
 *
 * Returns the current state of a workflow execution.
 * This allows the UI to poll for status or reconstruct state after refresh.
 *
 * Response: 200 OK
 * {
 *   state: "running" | "cancelling" | "cancelled" | "completed" | "failed" | "not_found"
 *   invocationId: string
 *   createdAt?: number
 *   cancelRequestedAt?: number
 * }
 */
export async function GET(req: NextRequest, { params }: { params: { invocationId: string } }) {
  try {
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult

    const { invocationId } = params

    if (!invocationId || typeof invocationId !== "string") {
      return NextResponse.json(
        {
          state: "not_found" as const,
          invocationId: invocationId || "unknown",
        },
        { status: 200 },
      )
    }

    // Check Redis first (authoritative source for distributed workflows)
    const redisState = await getWorkflowState(invocationId)
    const entry = activeWorkflows.get(invocationId)

    // Not found in either Redis or memory
    if (!redisState && !entry) {
      return NextResponse.json(
        {
          state: "not_found" as const,
          invocationId,
        },
        { status: 200 },
      )
    }

    // Return state from Redis if available, otherwise from memory
    if (redisState) {
      return NextResponse.json(
        {
          state: redisState.state,
          invocationId,
          createdAt: redisState.createdAt,
          cancelRequestedAt: redisState.cancelRequestedAt,
        },
        { status: 200 },
      )
    }

    // Fallback to in-memory entry (guaranteed to be defined here)
    if (!entry) {
      // TypeScript guard - should never happen due to logic above
      return NextResponse.json(
        {
          state: "not_found" as const,
          invocationId,
        },
        { status: 200 },
      )
    }

    return NextResponse.json(
      {
        state: entry.state,
        invocationId,
        createdAt: entry.createdAt,
        cancelRequestedAt: entry.cancelRequestedAt,
      },
      { status: 200 },
    )
  } catch (error) {
    logException(error, {
      location: "/api/workflow/status",
    })
    console.error("[/api/workflow/status] Error:", error)

    return NextResponse.json(
      {
        state: "not_found" as const,
        invocationId: params.invocationId || "unknown",
      },
      { status: 200 },
    )
  }
}
