import { retrieveWorkflowVersion } from "@/trace-visualization/db/Workflow/retrieveWorkflow"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wf_version_id: string }> }
) {
  try {
    const { wf_version_id } = await params

    const workflowVersion = await retrieveWorkflowVersion(wf_version_id)

    if (!workflowVersion) {
      return NextResponse.json(
        { error: "Workflow version not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(workflowVersion)
  } catch (error) {
    console.error("Failed to load workflow version:", error)

    return NextResponse.json(
      { error: "Failed to load workflow version" },
      { status: 500 }
    )
  }
}
