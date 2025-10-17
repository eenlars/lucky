import {
  createWorkflow,
  deleteWorkflow,
  retrieveWorkflowVersion,
  saveWorkflowVersion,
} from "@/features/trace-visualization/db/Workflow/retrieveWorkflow"
import { alrighty, fail, handleBody, isHandleBodyError } from "@/lib/api/server"
import { auth } from "@clerk/nextjs/server"
import { genShortId } from "@lucky/shared/client"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

  const body = await handleBody("workflow/upsert-workflow", request)
  if (isHandleBodyError(body)) return body

  try {
    const { dsl, workflowVersionId, workflowName, commitMessage, iterationBudget, timeBudgetSeconds } = body

    if (!dsl || !commitMessage) {
      return fail("workflow/upsert-workflow", "dsl and commitMessage are required", {
        code: "INVALID_INPUT",
        status: 400,
      })
    }

    let workflowId: string
    let parentId: string | undefined
    let finalIterationBudget = iterationBudget ?? 50
    let finalTimeBudgetSeconds = timeBudgetSeconds ?? 3600

    if (workflowVersionId) {
      // Editing existing workflow - look up the version to get workflow_id and inherit settings
      try {
        const existingVersion = await retrieveWorkflowVersion(workflowVersionId)
        if (!existingVersion.workflow_id) {
          return fail("workflow/upsert-workflow", "Workflow version has no associated workflow", {
            code: "INVALID_VERSION",
            status: 400,
          })
        }
        workflowId = existingVersion.workflow_id
        parentId = workflowVersionId
        // Inherit budget settings from parent version if not explicitly provided
        if (iterationBudget === undefined) finalIterationBudget = existingVersion.iteration_budget
        if (timeBudgetSeconds === undefined) finalTimeBudgetSeconds = existingVersion.time_budget_seconds
      } catch (_versionError) {
        return fail("workflow/upsert-workflow", "Workflow version not found", {
          code: "VERSION_NOT_FOUND",
          status: 404,
        })
      }
    } else {
      // Creating new workflow
      if (!workflowName) {
        return fail("workflow/upsert-workflow", "workflowName is required for new workflows", {
          code: "INVALID_INPUT",
          status: 400,
        })
      }
      workflowId = `wf_id_${genShortId()}`
      await createWorkflow(workflowId, workflowName, userId)

      // Try to save the version, but rollback workflow creation if it fails
      try {
        const newVersion = await saveWorkflowVersion({
          dsl,
          commitMessage,
          workflowId,
          parentId,
          iterationBudget: finalIterationBudget,
          timeBudgetSeconds: finalTimeBudgetSeconds,
        })
        return alrighty("workflow/upsert-workflow", { success: true, data: { success: true, data: newVersion } })
      } catch (versionError) {
        // Rollback: delete the workflow we just created
        try {
          await deleteWorkflow(workflowId)
        } catch (cleanupError) {
          console.error("Failed to cleanup workflow after version save error:", cleanupError)
        }
        throw versionError
      }
    }

    // For existing workflows, just save the version
    const newVersion = await saveWorkflowVersion({
      dsl,
      commitMessage,
      workflowId,
      parentId,
      iterationBudget: finalIterationBudget,
      timeBudgetSeconds: finalTimeBudgetSeconds,
    })

    return alrighty("workflow/upsert-workflow", { success: true, data: { success: true, data: newVersion } })
  } catch (error) {
    console.error("Error upserting workflow:", error)
    return fail("workflow/upsert-workflow", error instanceof Error ? error.message : "Failed to save", {
      code: "UPSERT_ERROR",
      status: 500,
    })
  }
}
