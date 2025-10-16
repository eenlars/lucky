import { authenticateRequest } from "@/lib/auth/principal"
import { ObserverRegistry } from "@lucky/core/utils/observability/ObserverRegistry"
import type { AgentEvent } from "@lucky/shared"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // 5 minutes

/**
 * SSE endpoint for streaming agent execution events
 *
 * GET /api/agents/[randomId]/stream
 *
 * Returns Server-Sent Events for real-time agent execution monitoring
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ randomId: string }> }) {
  const { randomId } = await params

  // Authenticate
  const principal = await authenticateRequest(req)
  if (!principal) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  // Get observer from registry
  const observer = ObserverRegistry.getInstance().get(randomId)
  if (!observer) {
    return NextResponse.json({ error: "Workflow not found or expired" }, { status: 404 })
  }

  // Create SSE stream
  const encoder = new TextEncoder()
  let controller: ReadableStreamDefaultController | null = null

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl

      // Send initial connection message
      const connectionMsg = JSON.stringify({ type: "connected", randomId })
      controller.enqueue(encoder.encode(`data: ${connectionMsg}\n\n`))

      // Send buffered events first (backfill for reconnection)
      const bufferedEvents = observer.getEvents()
      for (const event of bufferedEvents) {
        const data = JSON.stringify(event)
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
      }

      // Subscribe to live events
      const unsubscribe = observer.subscribe((event: AgentEvent) => {
        try {
          const data = JSON.stringify(event)
          controller?.enqueue(encoder.encode(`data: ${data}\n\n`))
        } catch (error) {
          console.error("[SSE] Error sending event:", error)
        }
      })

      // Auto-close after 5 minutes
      const timeoutId = setTimeout(
        () => {
          unsubscribe()
          const timeoutMsg = JSON.stringify({ type: "timeout" })
          controller?.enqueue(encoder.encode(`data: ${timeoutMsg}\n\n`))
          controller?.close()
        },
        5 * 60 * 1000,
      )

      // Cleanup on client disconnect
      req.signal.addEventListener("abort", () => {
        clearTimeout(timeoutId)
        unsubscribe()
        controller?.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
