import { retrieveLatestWorkflowVersions } from "@/features/trace-visualization/db/Workflow/retrieveWorkflow"
import { requireAuth } from "@/lib/api-auth"
import { logException } from "@/lib/error-logger"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    const workflows = await retrieveLatestWorkflowVersions(limit)

    return NextResponse.json(workflows)
  } catch (error) {
    logException(error, {
      location: "/api/workflow/latest",
    })
    console.error("Failed to retrieve latest workflows:", error)
    return NextResponse.json({ error: "Failed to retrieve workflows" }, { status: 500 })
  }
}
