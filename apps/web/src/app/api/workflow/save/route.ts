import {
  ensureWorkflowExists,
  retrieveWorkflowVersion,
  saveWorkflowVersion,
} from "@/features/trace-visualization/db/Workflow/retrieveWorkflow"
import { requireAuth } from "@/lib/api-auth"
import { alrighty, fail, handleBody, isHandleBodyError } from "@/lib/api/server"
import { logException } from "@/lib/error-logger"
import type { Tables } from "@lucky/shared"
import { type NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  const authResult = await requireAuth()
  if (authResult) return authResult

  const body = await handleBody("workflow/save", request)
  if (isHandleBodyError(body)) return body

  const { dsl, commitMessage, parentId, workflowId: bodyWorkflowId, iterationBudget: bodyIterationBudget, timeBudgetSeconds: bodyTimeBudgetSeconds } = body as {
    dsl?: unknown
    commitMessage?: string
    parentId?: string
    workflowId?: string
    iterationBudget?: number
    timeBudgetSeconds?: number
  }

  // Validate required fields
  if (!dsl || !commitMessage) {
    return fail("workflow/save", "Missing required fields: dsl or commitMessage", {
      code: "MISSING_FIELDS",
      status: 400,
    })
  }

  let workflowId = bodyWorkflowId
  let iterationBudget = bodyIterationBudget
  let timeBudgetSeconds = bodyTimeBudgetSeconds

  try {

    // If editing an existing version, prefer authoritative workflow_id + budgets from parent
    if (parentId) {
      const parent = await retrieveWorkflowVersion(parentId).catch(() => null)
      if (!parent) {
        return fail("workflow/save", "Parent workflow version not found", {
          code: "PARENT_NOT_FOUND",
          status: 404,
        })
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
      return fail("workflow/save", "workflowId is required", {
        code: "MISSING_WORKFLOW_ID",
        status: 400,
      })
    }

    // Ensure workflow exists (new workflows) or confirm ownership (existing)
    try {
      await ensureWorkflowExists(commitMessage, workflowId, authResult as string)
    } catch (e) {
      const err = e as any
      if (err?.code === "WORKFLOW_OWNERSHIP_CONFLICT") {
        return fail(
          "workflow/save",
          "You don't have access to this workflow id. It likely predates ownership. Please duplicate to a new workflow or run the data backfill migration.",
          { code: "WORKFLOW_OWNERSHIP_CONFLICT", status: 409 },
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
        return fail(
          "workflow/save",
          "RLS blocked saving this version. The workflow may not be owned by your account. If this is legacy data, run the migration to backfill clerk_id or create a new workflow.",
          { code: "RLS_POLICY_VIOLATION", status: 403 },
        )
      }
      throw e
    }

    return alrighty("workflow/save", {
      success: true,
      data: newWorkflowVersion,
    })
  } catch (error) {
    logException(error, {
      location: "/api/workflow/save",
    })
    console.error("Error saving workflow version:", error)
    const message = error instanceof Error ? error.message : "Failed to save workflow version"
    return fail("workflow/save", message, { code: "SAVE_ERROR", status: 500 })
  }
}
