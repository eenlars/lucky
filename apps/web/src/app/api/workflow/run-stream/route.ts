import { requireAuth } from "@/lib/api-auth"
import { invokeWorkflow } from "@lucky/core/workflow/runner/invokeWorkflow"
import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import type { WorkflowProgressEvent } from "@lucky/shared"
import { type NextRequest, NextResponse } from "next/server"

// Prevent execution timeout (max 60 seconds for Vercel hobby plan)
export const runtime = "nodejs"
export const maxDuration = 60

/**
 * POST /api/workflow/run-stream
 *
 * Executes a workflow and streams progress events via Server-Sent Events (SSE).
 * The client receives real-time updates as each node starts, completes, or fails.
 *
 * Request body:
 * - dslConfig: WorkflowConfig object
 * - workflowId: string (unique ID for tracking)
 * - goal: string (workflow input/goal)
 * - [optional] answer: string (expected output for evaluation)
 *
 * Response: text/event-stream with JSON events of type WorkflowProgressEvent
 *
 * Security: Requires authentication via requireAuth()
 * Performance: 60 second maxDuration (Vercel hobby plan limit)
 */
export async function POST(req: NextRequest) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // Type guard for request body structure
  if (!body || typeof body !== "object" || !("dslConfig" in body) || !("workflowId" in body) || !("goal" in body)) {
    return NextResponse.json({ error: "Missing required fields: dslConfig, workflowId, goal" }, { status: 400 })
  }

  const { dslConfig, workflowId, goal, answer } = body as {
    dslConfig: WorkflowConfig
    workflowId: string
    goal: string
    answer?: string
  }

  try {
    // Security: Prevent DoS via massive workflow configs
    const MAX_NODES = 1000
    const MAX_GOAL_LENGTH = 50000

    if (!dslConfig.nodes || !Array.isArray(dslConfig.nodes)) {
      return NextResponse.json({ error: "Invalid workflow configuration: nodes must be an array" }, { status: 400 })
    }

    if (dslConfig.nodes.length > MAX_NODES) {
      return NextResponse.json(
        {
          error: `Workflow too complex: maximum ${MAX_NODES} nodes allowed, got ${dslConfig.nodes.length}`,
        },
        { status: 400 },
      )
    }

    if (goal.length > MAX_GOAL_LENGTH) {
      return NextResponse.json(
        {
          error: `Goal too long: maximum ${MAX_GOAL_LENGTH} characters allowed`,
        },
        { status: 400 },
      )
    }

    // Security: Validate workflowId format (prevent log injection)
    if (!/^[a-zA-Z0-9_-]+$/.test(workflowId)) {
      return NextResponse.json(
        { error: "Invalid workflowId format: alphanumeric, dash, and underscore only" },
        { status: 400 },
      )
    }

    // Create SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Invoke workflow with progress callback
          const result = await invokeWorkflow({
            dslConfig,
            evalInput: answer
              ? {
                  type: "text",
                  workflowId,
                  goal,
                  question: goal,
                  answer,
                }
              : {
                  type: "prompt-only",
                  workflowId,
                  goal,
                },
            onProgress: (event: WorkflowProgressEvent) => {
              // Send SSE event
              const data = `data: ${JSON.stringify(event)}\n\n`
              controller.enqueue(encoder.encode(data))
            },
          })

          // Send final result
          if (result.success) {
            const finalEvent = {
              type: "workflow_completed",
              results: result.data,
              timestamp: Date.now(),
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalEvent)}\n\n`))
          } else {
            const errorEvent = {
              type: "workflow_failed",
              error: result.error,
              timestamp: Date.now(),
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`))
          }

          controller.close()
        } catch (error) {
          // Security: Sanitize error messages to prevent information disclosure
          const sanitizedError =
            error instanceof Error
              ? error.message.replace(/\/[^\s]+/g, "[path]") // Remove file paths
              : "Workflow execution failed"

          const errorEvent = {
            type: "workflow_failed",
            error: sanitizedError,
            timestamp: Date.now(),
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering in production
      },
    })
  } catch (error) {
    console.error("[run-stream] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to start workflow",
      },
      { status: 500 },
    )
  }
}
