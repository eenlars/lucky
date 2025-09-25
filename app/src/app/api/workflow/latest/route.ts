import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { retrieveLatestWorkflowVersions } from "@/trace-visualization/db/Workflow/retrieveWorkflow"

export async function GET(request: NextRequest) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "10")

    const workflows = await retrieveLatestWorkflowVersions(limit)

    return NextResponse.json(workflows)
  } catch (error) {
    console.error("Failed to retrieve latest workflows:", error)
    return NextResponse.json({ error: "Failed to retrieve workflows" }, { status: 500 })
  }
}
