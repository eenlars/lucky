import { alrighty } from "@/lib/api/server"
import { getAllCredentialStatus } from "@lucky/core/utils/config/credential-status"
import { NextResponse } from "next/server"

/**
 * GET /api/status/health/credentials/all
 * Returns status of all credentials.
 */
export async function GET() {
  try {
    const credentials = getAllCredentialStatus()
    return alrighty("status/health/credentials/all", credentials)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to get credential status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
