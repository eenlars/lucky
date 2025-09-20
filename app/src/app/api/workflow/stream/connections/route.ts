/**
 * SSE Connection Management API
 *
 * Provides endpoints to monitor and manage active SSE connections
 * for workflow event streaming.
 */

import { NextRequest } from "next/server"
import { requireAuth, requireAdmin } from "@/lib/api-auth"
import { globalSSESink } from "@core/utils/observability/sinks/SSESink"

/**
 * Get information about active SSE connections
 */
export async function GET(req: NextRequest) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof Response) return authResult

  try {
    const connections = globalSSESink.getConnections()
    const connectionCount = globalSSESink.getConnectionCount()

    // Group connections by invocation ID for analytics
    const connectionsByInvocation = connections.reduce(
      (acc, conn) => {
        const invocationId = conn.metadata?.invocationId || "global"
        if (!acc[invocationId]) {
          acc[invocationId] = []
        }
        acc[invocationId].push(conn)
        return acc
      },
      {} as Record<string, typeof connections>
    )

    return Response.json({
      success: true,
      data: {
        connectionCount,
        connections,
        connectionsByInvocation,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get connection info",
      },
      { status: 500 }
    )
  }
}

/**
 * Force close specific connections (admin functionality)
 */
export async function DELETE(req: NextRequest) {
  // Require admin authentication
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult

  try {
    const { connectionId } = await req.json()

    if (!connectionId) {
      return Response.json(
        {
          success: false,
          error: "connectionId is required",
        },
        { status: 400 }
      )
    }

    globalSSESink.removeConnection(connectionId)

    return Response.json({
      success: true,
      message: `Connection ${connectionId} closed`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return Response.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to close connection",
      },
      { status: 500 }
    )
  }
}
