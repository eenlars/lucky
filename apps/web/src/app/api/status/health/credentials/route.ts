import { alrighty } from "@/lib/api/server"
import { getSystemHealth } from "@lucky/core/utils/config/credential-status"
import { NextResponse } from "next/server"

/**
 * GET /api/status/health/credentials
 * Returns overall system health based on credential configuration.
 */
export async function GET() {
  try {
    const health = getSystemHealth()
    return alrighty("status/health/credentials", {
      ...health,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to check system health",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
