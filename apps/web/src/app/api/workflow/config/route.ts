import {
  retrieveLatestWorkflowVersions,
  saveWorkflowVersion,
} from "@/features/trace-visualization/db/Workflow/retrieveWorkflow"
import { alrighty, fail, handleBody, isHandleBodyError } from "@/lib/api/server"
import { ensureCoreInit } from "@/lib/ensure-core-init"
import { logException } from "@/lib/error-logger"
import { auth } from "@clerk/nextjs/server"
import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import {
  loadFromDatabaseForDisplay,
  loadSingleWorkflow,
  saveWorkflowConfig,
} from "@lucky/core/workflow/setup/WorkflowLoader"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  // Require authentication
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

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
    return alrighty("workflow/config", workflowConfig)
  } catch (error) {
    logException(error, {
      location: "/api/workflow/config/GET",
    })
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

          return alrighty("workflow/config", {
            ...workflowConfig,
            _fallbackVersion: latestVersion.wf_version_id,
            _fallbackMessage: "Loaded latest workflow version from database",
          })
        }
      } catch (fallbackError) {
        console.error("Failed to load fallback workflow from database:", fallbackError)
      }
    }

    return fail("workflow/config", "Failed to load workflow configuration", {
      code: "LOAD_ERROR",
      status: 500,
    })
  }
}

export async function POST(req: NextRequest) {
  // Require authentication
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

  // Ensure core is initialized
  ensureCoreInit()

  const body = await handleBody("workflow/config", req)
  if (isHandleBodyError(body)) return body

  const bodyData = body as any
  const dsl = bodyData?.dsl ?? bodyData?.workflow ?? bodyData
  if (!dsl || typeof dsl !== "object") {
    return fail("workflow/config", "Invalid DSL payload", { code: "INVALID_DSL", status: 400 })
  }

  try {
    // Optional metadata for DB mode
    const workflowId = bodyData?.workflowId as string | undefined
    const commitMessage = bodyData?.commitMessage as string | undefined
    const parentId = bodyData?.parentVersionId as string | undefined
    const iterationBudget = bodyData?.iterationBudget as number | undefined
    const timeBudgetSeconds = bodyData?.timeBudgetSeconds as number | undefined

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

    return alrighty("workflow/config", { success: true, ...result })
  } catch (error) {
    logException(error, {
      location: "/api/workflow/config/POST",
    })
    console.error("Failed to save workflow config:", error)
    return fail("workflow/config", "Failed to save workflow configuration", {
      code: "SAVE_ERROR",
      status: 500,
    })
  }
}
