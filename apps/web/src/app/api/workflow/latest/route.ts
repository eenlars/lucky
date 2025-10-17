import { retrieveLatestWorkflowVersions } from "@/features/trace-visualization/db/Workflow/retrieveWorkflow"
import { alrighty, fail } from "@/lib/api/server"
import { logException } from "@/lib/error-logger"
import { auth } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  // Require authentication
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    const workflows = await retrieveLatestWorkflowVersions(limit)

    return alrighty("workflow/latest", workflows)
  } catch (error) {
    logException(error, {
      location: "/api/workflow/latest",
    })
    console.error("Failed to retrieve latest workflows:", error)
    return fail("workflow/latest", "Failed to retrieve workflows", {
      code: "WORKFLOW_RETRIEVAL_ERROR",
      status: 500,
    })
  }
}
