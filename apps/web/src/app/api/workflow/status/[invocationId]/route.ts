import { activeWorkflows } from "@/features/workflow-or-chat-invocation/workflow/active-workflows"
import { requireAuthWithApiKey } from "@/lib/api-auth"
import { alrighty } from "@/lib/api/server"
import { logException } from "@/lib/error-logger"
import { getWorkflowState } from "@/lib/redis/workflow-state"
import { type NextRequest, NextResponse } from "next/server"

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
export async function GET(req: NextRequest, { params }: { params: Promise<{ invocationId: string }> }) {
  try {
    const authResult = await requireAuthWithApiKey(req)
    if (authResult instanceof NextResponse) return authResult

    const { invocationId } = await params

    if (!invocationId || typeof invocationId !== "string") {
      return alrighty("workflow/status/[invocationId]", {
        state: "not_found" as const,
        invocationId: invocationId || "unknown",
      })
    }

    // Check Redis first (authoritative source for distributed workflows)
    const redisState = await getWorkflowState(invocationId)
    const entry = activeWorkflows.get(invocationId)

    // Not found in either Redis or memory
    if (!redisState && !entry) {
      return alrighty("workflow/status/[invocationId]", {
        state: "not_found" as const,
        invocationId,
      })
    }

    // Return state from Redis if available, otherwise from memory
    if (redisState) {
      return alrighty("workflow/status/[invocationId]", {
        state: redisState.state,
        invocationId,
        createdAt: redisState.createdAt,
        cancelRequestedAt: redisState.cancelRequestedAt,
      })
    }

    // Fallback to in-memory entry (guaranteed to be defined here)
    if (!entry) {
      // TypeScript guard - should never happen due to logic above
      return alrighty("workflow/status/[invocationId]", {
        state: "not_found" as const,
        invocationId,
      })
    }

    return alrighty("workflow/status/[invocationId]", {
      state: entry.state,
      invocationId,
      createdAt: entry.createdAt,
      cancelRequestedAt: entry.cancelRequestedAt,
    })
  } catch (error) {
    logException(error, {
      location: "/api/workflow/status",
    })
    console.error("[/api/workflow/status] Error:", error)

    return alrighty("workflow/status/[invocationId]", {
      state: "not_found" as const,
      invocationId: "unknown",
    })
  }
}
