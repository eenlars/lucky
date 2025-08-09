import { loadFromDatabaseForDisplay } from "@core/workflow/setup/WorkflowLoader"
import { NextRequest, NextResponse } from "next/server"

// revalidate every 5 minutes (300 seconds)
export const revalidate = 300

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wf_version_id: string }> }
) {
  try {
    const { wf_version_id } = await params

    const workflowConfig = await loadFromDatabaseForDisplay(wf_version_id)

    return NextResponse.json({ dsl: workflowConfig })
  } catch (error) {
    console.error("Failed to load workflow version:", error)

    return NextResponse.json(
      { error: "Failed to load workflow version" },
      { status: 500 }
    )
  }
}
