import { activeWorkflows } from "@/features/workflow-or-chat-invocation/workflow/active-workflows"
import { authenticateRequest } from "@/lib/auth/principal"
import { logException } from "@/lib/error-logger"
import { getWorkflowState, publishCancellation, setWorkflowState } from "@/lib/redis/workflow-state"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * POST /api/workflow/cancel/[invocationId]
 *
 * RESTful endpoint for canceling a running workflow (Phase 1 MCP requirement).
 * Gracefully cancels a running workflow by triggering its AbortController.
 * The workflow will stop after the current node completes.
 *
 * This endpoint is idempotent - multiple cancel requests return consistent state.
 * Always returns 202 Accepted with the current state in the response body.
 *
 * Supports both API key (Bearer token) and Clerk session authentication.
 *
 * URL parameter:
 *   invocationId: string (e.g., inv_abc123)
 *
 * Response: 202 Accepted
 * {
 *   status: "cancelling" | "already_completed" | "already_cancelled" | "not_found"
 *   invocationId: string
 *   cancelRequestedAt?: number
 *   message: string
 * }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ invocationId: string }> }) {
  try {
    // Unified authentication: API key or Clerk session
    const principal = await authenticateRequest(req)
    if (!principal) {
      return NextResponse.json(
        {
          status: "not_found" as const,
          invocationId: "unknown",
          message: "Unauthorized",
        },
        { status: 401 },
      )
    }

    const { invocationId } = await params

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
    // Set both state and desired to "cancelling" so status endpoint immediately returns "cancelling"
    await setWorkflowState(invocationId, {
      state: "cancelling",
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

    console.log(`[POST /api/workflow/cancel/${invocationId}] Cancellation requested`)

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
      location: "/api/workflow/cancel/[invocationId]",
    })
    console.error("[POST /api/workflow/cancel/[invocationId]] Error:", error)

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
