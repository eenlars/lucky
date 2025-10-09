import { getAllFeatureStatus } from "@lucky/core/utils/config/credential-status"
import { NextResponse } from "next/server"

/**
 * GET /api/health/features
 * Returns status of all features.
 */
export async function GET() {
  try {
    const features = getAllFeatureStatus()
    return NextResponse.json(features)
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
