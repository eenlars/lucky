import { alrighty } from "@/lib/api/server"
import { getAllFeatureStatus } from "@lucky/core/utils/config/credential-status"
import { NextResponse } from "next/server"

/**
 * GET /api/status/health/features
 * Returns status of all features.
 */
export async function GET() {
  try {
    const features = getAllFeatureStatus()
    return alrighty("status/health/features", features)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to get feature status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
