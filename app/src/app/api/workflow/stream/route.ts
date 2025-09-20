/**
 * Server-Sent Events endpoint for real-time workflow updates
 *
 * Provides streaming updates for workflow execution including:
 * - Node execution progress
 * - Message queue processing
 * - Tool invocations
 * - LLM calls
 * - Memory updates
 * - Error events
 */

import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import {
  globalSSESink,
  type EventFilter,
} from "@core/utils/observability/sinks/SSESink"
import { setSink, TeeSink, StdoutSink } from "@core/utils/observability/obs"
import { genShortId } from "@core/utils/common/utils"

/**
 * Stream workflow events via Server-Sent Events
 *
 * Query parameters:
 * - invocationId: Filter events for specific workflow invocation
 * - nodeId: Filter events for specific node
 * - events: Comma-separated list of event types to include
 * - excludeHeartbeat: Set to 'true' to exclude heartbeat events
 */
export async function GET(req: NextRequest) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof Response) return authResult

  const { searchParams } = new URL(req.url)
  const invocationId = searchParams.get("invocationId")
  const nodeId = searchParams.get("nodeId")
  const events = searchParams.get("events")
  const excludeHeartbeat = searchParams.get("excludeHeartbeat") === "true"

  // Generate unique connection ID
  const connectionId = `sse_${genShortId()}`

  // Configure event filters based on query parameters
  const filters: EventFilter[] = []

  // Filter by invocation ID if specified
  if (invocationId) {
    filters.push({
      type: "include",
      patterns: ["*"],
      attributes: { invocationId },
    })
  }

  // Filter by node ID if specified
  if (nodeId) {
    filters.push({
      type: "include",
      patterns: ["*"],
      attributes: { nodeId },
    })
  }

  // Filter by event types if specified
  if (events) {
    const eventPatterns = events.split(",").map((e) => e.trim())
    filters.push({
      type: "include",
      patterns: eventPatterns,
    })
  }

  // Exclude heartbeat events if requested
  if (excludeHeartbeat) {
    filters.push({
      type: "exclude",
      patterns: ["heartbeat"],
    })
  }

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Add connection to global SSE sink
      globalSSESink.addConnection(connectionId, controller, {
        filters,
        metadata: {
          invocationId,
          nodeId,
          connectedAt: new Date().toISOString(),
          userAgent: req.headers.get("user-agent"),
        },
        sendBuffered: true, // Send recent events to new connections
      })

      // Set up global sink to include SSE if not already configured
      try {
        setSink(
          new TeeSink([
            new StdoutSink(), // Keep console logging
            globalSSESink, // Add SSE streaming
          ])
        )
      } catch (error) {
        console.warn("SSE sink already configured or error setting up:", error)
      }

      // Send initial connection confirmation
      const welcomeEvent = {
        event: "connection:established",
        ts: new Date().toISOString(),
        connectionId,
        message: "Real-time workflow updates connected",
        filters: filters.length > 0 ? filters : undefined,
      }

      const sseData = `data: ${JSON.stringify(welcomeEvent)}\n\n`
      controller.enqueue(new TextEncoder().encode(sseData))
    },

    cancel() {
      // Clean up connection when client disconnects
      globalSSESink.removeConnection(connectionId)
      console.log(`SSE connection closed: ${connectionId}`)
    },
  })

  // Return SSE response with proper headers
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  })
}

/**
 * Get active SSE connections for monitoring
 */
export async function POST(req: NextRequest) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof Response) return authResult

  try {
    const connections = globalSSESink.getConnections()
    const connectionCount = globalSSESink.getConnectionCount()

    return Response.json({
      success: true,
      data: {
        connectionCount,
        connections,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return Response.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get connections",
      },
      { status: 500 }
    )
  }
}
