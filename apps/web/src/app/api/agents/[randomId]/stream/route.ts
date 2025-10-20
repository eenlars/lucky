import { authenticateRequest } from "@/lib/auth/principal"
import { ObserverRegistry } from "@lucky/core/utils/observability/ObserverRegistry"
import type { AgentEvent } from "@lucky/shared"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 59 // 1 minute (Vercel hobby plan limit for prod; dev can run longer)

/**
 * SSE endpoint for streaming agent execution events
 *
 * GET /api/agents/[randomId]/stream
 *
 * Returns Server-Sent Events for real-time agent execution monitoring
 */
export async function GET(req: NextRequest, { params }: { params: { randomId: string } }) {
  const { randomId } = params

  // Authenticate
  const principal = await authenticateRequest(req)
  if (!principal) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  // Attempt to get observer; allow brief wait for it to register
  // This enables the client to open SSE first, then trigger the pipeline
  const registry = ObserverRegistry.getInstance()
  let observer = registry.get(randomId)
  if (!observer) {
    // wait up to 3s for the observer to appear
    const started = Date.now()
    while (!observer && Date.now() - started < 3000) {
      // Abort early if client disconnects
      if (req.signal.aborted) break
      await new Promise(res => setTimeout(res, 50))
      observer = registry.get(randomId)
    }
  }
  if (!observer) {
    return NextResponse.json({ error: "Workflow not found or expired" }, { status: 404 })
  }

  // Create SSE stream
  const encoder = new TextEncoder()
  let controller: ReadableStreamDefaultController | null = null

  const STREAM_MAX_MS = process.env.NODE_ENV === "development" ? 5 * 60 * 1000 : 58 * 1000

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl

      // Send initial connection message
      const connectionMsg = JSON.stringify({ type: "connected", randomId })
      controller.enqueue(encoder.encode(`data: ${connectionMsg}\n\n`))

      // Send buffered events first (backfill for late connection)
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

      // Auto-close after a timeout (longer in dev)
      const timeoutId = setTimeout(() => {
        unsubscribe()
        const timeoutMsg = JSON.stringify({ type: "timeout" })
        controller?.enqueue(encoder.encode(`data: ${timeoutMsg}\n\n`))
        controller?.close()
      }, STREAM_MAX_MS)

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
