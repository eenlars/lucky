import {
  createWorkflow,
  deleteWorkflow,
  retrieveWorkflowVersion,
  saveWorkflowVersion,
} from "@/features/trace-visualization/db/Workflow/retrieveWorkflow"
import { requireAuth } from "@/lib/api-auth"
import { genShortId } from "@lucky/shared/client"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = await request.json()
    const { dsl, workflowVersionId, workflowName, commitMessage, iterationBudget, timeBudgetSeconds } = body

    if (!dsl || !commitMessage) {
      return NextResponse.json({ error: "dsl and commitMessage are required" }, { status: 400 })
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
          return NextResponse.json({ error: "Workflow version has no associated workflow" }, { status: 400 })
        }
        workflowId = existingVersion.workflow_id
        parentId = workflowVersionId
        // Inherit budget settings from parent version if not explicitly provided
        if (iterationBudget === undefined) finalIterationBudget = existingVersion.iteration_budget
        if (timeBudgetSeconds === undefined) finalTimeBudgetSeconds = existingVersion.time_budget_seconds
      } catch (_versionError) {
        return NextResponse.json({ error: "Workflow version not found" }, { status: 404 })
      }
    } else {
      // Creating new workflow
      if (!workflowName) {
        return NextResponse.json({ error: "workflowName is required for new workflows" }, { status: 400 })
      }
      workflowId = `wf_id_${genShortId()}`
      await createWorkflow(workflowId, workflowName, authResult)

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
        return NextResponse.json({ success: true, data: newVersion })
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

    return NextResponse.json({ success: true, data: newVersion })
  } catch (error) {
    console.error("Error upserting workflow:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save" }, { status: 500 })
  }
}
