import { retrieveLatestWorkflowVersions } from "@/trace-visualization/db/Workflow/retrieveWorkflow"
import { loadLiveWorkflowConfig, saveLiveWorkflowConfig } from "@lucky/core/utils/persistence/liveConfig"
import { loadFromDatabaseForDisplay } from "@lucky/core/workflow/setup/WorkflowLoader"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { ensureCoreInit } from "@/lib/ensure-core-init"

export async function GET(req: Request) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  // Ensure core is initialized
  ensureCoreInit()

  try {
    const { searchParams } = new URL(req.url)
    const wfVersionId = searchParams.get("wf_version_id") || undefined
    const workflowId = searchParams.get("workflow_id") || undefined
    // Frontend should not control backend file selection; always use loader's current config

    // Storage-adapter: file locally, DB in production.
    // Supports querying a specific version or the latest per workflow.
    const workflowConfig = await loadLiveWorkflowConfig(undefined as any, {
      wfVersionId,
      workflowId,
    })

    // Return only the workflow itself
    return NextResponse.json(workflowConfig)
  } catch (error) {
    console.error("Failed to load workflow config:", error)

    // Fallback: latest from DB (kept for resilience)
    if (process.env.NODE_ENV === "production") {
      try {
        console.log("Attempting to load latest workflow version from database...")
        const latestVersions = await retrieveLatestWorkflowVersions(1)

        if (latestVersions.length > 0) {
          const latestVersion = latestVersions[0]
          const workflowConfig = await loadFromDatabaseForDisplay(latestVersion.wf_version_id)

          console.log("Successfully loaded latest workflow version:", latestVersion.wf_version_id)

          return NextResponse.json({
            ...workflowConfig,
            _fallbackVersion: latestVersion.wf_version_id,
            _fallbackMessage: "Loaded latest workflow version from database",
          })
        }
      } catch (fallbackError) {
        console.error("Failed to load fallback workflow from database:", fallbackError)
      }
    }

    return NextResponse.json({ error: "Failed to load workflow configuration" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  // Ensure core is initialized
  ensureCoreInit()

  try {
    const body = await req.json()
    const dsl = body?.dsl ?? body?.workflow ?? body
    if (!dsl || typeof dsl !== "object") {
      return NextResponse.json({ error: "Invalid DSL payload" }, { status: 400 })
    }

    // Optional metadata for DB mode
    const opts = {
      workflowId: body?.workflowId as string | undefined,
      commitMessage: body?.commitMessage as string | undefined,
      parentVersionId: body?.parentVersionId as string | undefined,
      iterationBudget: body?.iterationBudget as number | undefined,
      timeBudgetSeconds: body?.timeBudgetSeconds as number | undefined,
    }

    const result = await saveLiveWorkflowConfig(dsl, opts)

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("Failed to save live workflow config:", error)
    return NextResponse.json({ error: "Failed to save live workflow configuration" }, { status: 500 })
  }
}
