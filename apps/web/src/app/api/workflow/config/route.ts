import {
  retrieveLatestWorkflowVersions,
  saveWorkflowVersion,
} from "@/features/trace-visualization/db/Workflow/retrieveWorkflow"
import { requireAuth } from "@/lib/api-auth"
import { ensureCoreInit } from "@/lib/ensure-core-init"
import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import {
  loadFromDatabaseForDisplay,
  loadSingleWorkflow,
  saveWorkflowConfig,
} from "@lucky/core/workflow/setup/WorkflowLoader"
import { NextResponse } from "next/server"

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

    let workflowConfig: WorkflowConfig

    // If specific version ID provided, load it from database
    if (wfVersionId) {
      workflowConfig = await loadFromDatabaseForDisplay(wfVersionId)
    }
    // If workflow ID provided, get latest version for that workflow
    else if (workflowId) {
      const latestVersions = await retrieveLatestWorkflowVersions(1)
      const workflowVersion = latestVersions.find(v => v.workflow_id === workflowId)

      if (workflowVersion) {
        workflowConfig = await loadFromDatabaseForDisplay(workflowVersion.wf_version_id)
      } else {
        // Fall back to file-based config if no DB version found
        workflowConfig = await loadSingleWorkflow()
      }
    }
    // Default: load from file (setupfile.json)
    else {
      if (process.env.NODE_ENV === "production") {
        // In production, try to get latest from DB first
        const latestVersions = await retrieveLatestWorkflowVersions(1)
        if (latestVersions.length > 0) {
          workflowConfig = await loadFromDatabaseForDisplay(latestVersions[0].wf_version_id)
        } else {
          workflowConfig = await loadSingleWorkflow()
        }
      } else {
        // In development, use file-based config
        workflowConfig = await loadSingleWorkflow()
      }
    }

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
    const workflowId = body?.workflowId as string | undefined
    const commitMessage = body?.commitMessage as string | undefined
    const parentId = body?.parentVersionId as string | undefined
    const iterationBudget = body?.iterationBudget as number | undefined
    const timeBudgetSeconds = body?.timeBudgetSeconds as number | undefined

    let result: { [key: string]: any }

    if (process.env.NODE_ENV === "production" && workflowId) {
      // In production with workflow ID, save to database
      const versionData = await saveWorkflowVersion({
        dsl,
        commitMessage: commitMessage || "Updated workflow configuration",
        workflowId,
        parentId,
        iterationBudget,
        timeBudgetSeconds,
      })

      result = {
        wf_version_id: versionData.wf_version_id,
        workflow_id: versionData.workflow_id,
        created_at: versionData.created_at,
      }
    } else {
      // In development or without workflow ID, save to file
      await saveWorkflowConfig(dsl, "setupfile.json", false)
      result = {
        message: "Workflow saved to file",
        filename: "setupfile.json",
      }
    }

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("Failed to save workflow config:", error)
    return NextResponse.json({ error: "Failed to save workflow configuration" }, { status: 500 })
  }
}
