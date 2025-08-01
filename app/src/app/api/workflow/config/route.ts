import { PATHS } from "@/runtime/settings/constants"
import {
  loadSingleWorkflow,
  loadFromDatabaseForDisplay,
} from "@workflow/setup/WorkflowLoader"
import { retrieveLatestWorkflowVersions } from "@/trace-visualization/db/Workflow/retrieveWorkflow"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const workflowConfig = await loadSingleWorkflow(PATHS.setupFile)

    return NextResponse.json(workflowConfig)
  } catch (error) {
    console.error("Failed to load workflow config:", error)

    // In production, fallback to loading the latest trace from Supabase
    if (process.env.NODE_ENV === "production") {
      try {
        console.log(
          "Attempting to load latest workflow version from database..."
        )
        const latestVersions = await retrieveLatestWorkflowVersions(1)

        if (latestVersions.length > 0) {
          const latestVersion = latestVersions[0]
          const workflowConfig = await loadFromDatabaseForDisplay(
            latestVersion.wf_version_id
          )

          console.log(
            "Successfully loaded latest workflow version:",
            latestVersion.wf_version_id
          )

          return NextResponse.json({
            ...workflowConfig,
            _fallbackVersion: latestVersion.wf_version_id,
            _fallbackMessage: "Loaded latest workflow version from database",
          })
        }
      } catch (fallbackError) {
        console.error(
          "Failed to load fallback workflow from database:",
          fallbackError
        )
      }
    }

    return NextResponse.json(
      { error: "Failed to load workflow configuration" },
      { status: 500 }
    )
  }
}
