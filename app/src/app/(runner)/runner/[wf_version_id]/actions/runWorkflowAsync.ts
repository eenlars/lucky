"use server"

import { genShortId } from "@/core/utils/common/utils"
import type { EvaluationText } from "@/core/workflow/ingestion/ingestion.types"
import { invokeWorkflow } from "@/core/workflow/runner/invokeWorkflow"
import type { WorkflowConfig } from "@workflow/schema/workflow.types"

interface AsyncWorkflowExecution {
  invocationId: string
  workflowId: string
  prompt: string
  status: "running" | "completed" | "failed"
  result?: any
  error?: string
  startTime: Date
}

// In-memory store for async executions (in production, use Redis or database)
const asyncExecutions = new Map<string, AsyncWorkflowExecution>()

export async function startWorkflowExecution(
  dslConfig: WorkflowConfig,
  workflowId: string,
  prompt: string
): Promise<{ invocationId: string; success: boolean; error?: string }> {
  try {
    const invocationId = genShortId()

    // Store initial execution state
    const execution: AsyncWorkflowExecution = {
      invocationId,
      workflowId,
      prompt,
      status: "running",
      startTime: new Date(),
    }

    asyncExecutions.set(invocationId, execution)

    // Start the workflow execution asynchronously
    executeWorkflowAsync(dslConfig, workflowId, prompt, invocationId)

    return {
      invocationId,
      success: true,
    }
  } catch (error) {
    return {
      invocationId: "",
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to start workflow execution",
    }
  }
}

async function executeWorkflowAsync(
  dslConfig: WorkflowConfig,
  workflowId: string,
  prompt: string,
  invocationId: string
) {
  try {
    const execution = asyncExecutions.get(invocationId)
    if (!execution) return

    const evalInput: EvaluationText = {
      workflowId,
      type: "text" as const,
      question: prompt,
      answer: "Expected output",
      goal: "Execute workflow with user prompt",
    }

    const result = await invokeWorkflow({
      dslConfig,
      evalInput,
    })

    // Update execution state
    execution.status = result.success ? "completed" : "failed"
    execution.result = result.success ? result : undefined
    execution.error = result.success ? undefined : result.error

    asyncExecutions.set(invocationId, execution)
  } catch (error) {
    const execution = asyncExecutions.get(invocationId)
    if (execution) {
      execution.status = "failed"
      execution.error = error instanceof Error ? error.message : "Unknown error"
      asyncExecutions.set(invocationId, execution)
    }
  }
}

export async function getWorkflowExecutionStatus(
  invocationId: string
): Promise<{
  success: boolean
  execution?: AsyncWorkflowExecution
  error?: string
}> {
  try {
    const execution = asyncExecutions.get(invocationId)

    if (!execution) {
      return {
        success: false,
        error: "Execution not found",
      }
    }

    return {
      success: true,
      execution,
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get execution status",
    }
  }
}
