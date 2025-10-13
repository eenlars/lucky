import {
  ensureWorkflowExists,
  retrieveWorkflowVersion,
  saveWorkflowVersion,
} from "@/features/trace-visualization/db/Workflow/retrieveWorkflow"
import { requireAuth } from "@/lib/api-auth"
import { logException } from "@/lib/error-logger"
import type { Tables } from "@lucky/shared"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  console.log("authResult", authResult)

  try {
    const body = await request.json()
    const { dsl, commitMessage } = body

    console.log("body", JSON.stringify(body, null, 2))

    const { parentId } = body as { parentId?: string }
    let { workflowId, iterationBudget, timeBudgetSeconds } = body as {
      dsl: unknown
      commitMessage: string
      workflowId?: string
      iterationBudget?: number
      timeBudgetSeconds?: number
    }

    // Validate required fields
    if (!dsl || !commitMessage) {
      return NextResponse.json({ error: "Missing required fields: dsl or commitMessage" }, { status: 400 })
    }

    // If editing an existing version, prefer authoritative workflow_id + budgets from parent
    if (parentId) {
      const parent = await retrieveWorkflowVersion(parentId).catch(() => null)
      console.log("parent", parent)
      if (!parent) {
        return NextResponse.json({ error: "Parent workflow version not found" }, { status: 404 })
      }
      workflowId = parent.workflow_id
      if (iterationBudget === undefined || iterationBudget === null) iterationBudget = parent.iteration_budget
      if (timeBudgetSeconds === undefined || timeBudgetSeconds === null) timeBudgetSeconds = parent.time_budget_seconds
    }

    // Apply defaults if not set by body or parent
    if (iterationBudget === undefined || iterationBudget === null) iterationBudget = 50
    if (timeBudgetSeconds === undefined || timeBudgetSeconds === null) timeBudgetSeconds = 3600

    // Validate workflowId after resolving parent
    if (!workflowId) {
      return NextResponse.json({ error: "workflowId is required" }, { status: 400 })
    }

    // Ensure workflow exists (new workflows) or confirm ownership (existing)
    try {
      await ensureWorkflowExists(commitMessage, workflowId, authResult)
    } catch (e) {
      const err = e as any
      if (err?.code === "WORKFLOW_OWNERSHIP_CONFLICT") {
        return NextResponse.json(
          {
            error:
              "You don't have access to this workflow id. It likely predates ownership. Please duplicate to a new workflow or run the data backfill migration.",
            code: "WORKFLOW_OWNERSHIP_CONFLICT",
          },
          { status: 409 },
        )
      }
      throw e
    }

    // Save the workflow version
    let newWorkflowVersion: Tables<"WorkflowVersion"> | null = null
    try {
      newWorkflowVersion = await saveWorkflowVersion({
        dsl,
        commitMessage,
        workflowId,
        parentId,
        iterationBudget,
        timeBudgetSeconds,
      })
    } catch (e) {
      const err = e as any
      // Translate RLS errors into actionable feedback
      if (err?.code === "42501") {
        return NextResponse.json(
          {
            error:
              "RLS blocked saving this version. The workflow may not be owned by your account. If this is legacy data, run the migration to backfill clerk_id or create a new workflow.",
            code: "RLS_POLICY_VIOLATION",
          },
          { status: 403 },
        )
      }
      throw e
    }

    return NextResponse.json({
      success: true,
      data: newWorkflowVersion,
    })
  } catch (error) {
    logException(error, {
      location: "/api/workflow/save",
    })
    console.error("Error saving workflow version:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to save workflow version",
      },
      { status: 500 },
    )
  }
}
