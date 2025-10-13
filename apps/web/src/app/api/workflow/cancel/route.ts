import { requireAuth } from "@/lib/api-auth"
import { logException } from "@/lib/error-logger"
import { getWorkflowState, publishCancellation, setWorkflowState } from "@/lib/redis/workflow-state"
import { type NextRequest, NextResponse } from "next/server"
import { activeWorkflows } from "../invoke/route"

/**
 * Canonical cancellation response states
 */
type CancelResponseStatus =
  | "cancelling" // Cancellation in progress
  | "already_completed" // Workflow finished before cancel
  | "already_cancelled" // Already cancelled
  | "not_found" // Invalid invocationId

interface CancelResponse {
  status: CancelResponseStatus
  invocationId: string
  cancelRequestedAt?: number
  message: string
}

/**
 * POST /api/workflow/cancel
 *
 * Gracefully cancels a running workflow by triggering its AbortController.
 * The workflow will stop after the current node completes.
 *
 * This endpoint is idempotent - multiple cancel requests return consistent state.
 * Always returns 202 Accepted with the current state in the response body.
 *
 * Request body:
 * {
 *   invocationId: string
 * }
 *
 * Response: 202 Accepted
 * {
 *   status: "cancelling" | "already_completed" | "already_cancelled" | "not_found"
 *   invocationId: string
 *   cancelRequestedAt?: number
 *   message: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult

    const body = await req.json()
    const { invocationId } = body

    if (!invocationId || typeof invocationId !== "string") {
      return NextResponse.json(
        {
          status: "not_found" as const,
          invocationId: invocationId || "unknown",
          message: "Missing or invalid invocationId",
        },
        { status: 202 }, // 202 even for validation errors to keep idempotent
      )
    }

    // Check Redis state first (distributed case)
    const redisState = await getWorkflowState(invocationId)
    const entry = activeWorkflows.get(invocationId)

    // Workflow not found in either Redis or memory
    if (!redisState && !entry) {
      return NextResponse.json(
        {
          status: "not_found" as const,
          invocationId,
          message: "Workflow not found or already completed",
        },
        { status: 202 },
      )
    }

    // Check if already cancelled (from Redis or memory)
    const currentState = redisState?.state || entry?.state
    const cancelRequestedAt = redisState?.cancelRequestedAt || entry?.cancelRequestedAt

    if (currentState === "cancelled" || currentState === "cancelling") {
      return NextResponse.json(
        {
          status: currentState === "cancelled" ? "already_cancelled" : "cancelling",
          invocationId,
          cancelRequestedAt,
          message: currentState === "cancelled" ? "Workflow was already cancelled" : "Cancellation already in progress",
        },
        { status: 202 },
      )
    }

    // Transition to cancelling state
    const now = Date.now()

    // Update Redis state (persistent, distributed)
    await setWorkflowState(invocationId, {
      desired: "cancelling",
      cancelRequestedAt: now,
    })

    // Publish real-time cancellation signal via Redis pub/sub
    await publishCancellation(invocationId)

    // Also update in-memory entry if present (for same-server workflows)
    if (entry) {
      entry.state = "cancelling"
      entry.cancelRequestedAt = now
      entry.controller.abort()
    }

    console.log(`[/api/workflow/cancel] Cancellation requested for ${invocationId}`)

    return NextResponse.json(
      {
        status: "cancelling" as const,
        invocationId,
        cancelRequestedAt: now,
        message: "Cancellation requested. Workflow will stop after current node completes.",
      },
      { status: 202 },
    )
  } catch (error) {
    logException(error, {
      location: "/api/workflow/cancel",
    })
    console.error("[/api/workflow/cancel] Error:", error)

    // Even errors return 202 with state in body for idempotency
    return NextResponse.json(
      {
        status: "not_found" as const,
        invocationId: "unknown",
        message: error instanceof Error ? error.message : "Failed to cancel workflow",
      },
      { status: 202 },
    )
  }
}
