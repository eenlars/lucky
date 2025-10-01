import { genShortId } from "@lucky/core/utils/common/utils"
import type { EvaluationText } from "@lucky/core/workflow/ingestion/ingestion.types"
import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { dslConfig, workflowId, prompt } = body as {
      dslConfig: WorkflowConfig
      workflowId: string
      prompt: string
    }

    if (!dslConfig || !workflowId || !prompt) {
      return NextResponse.json({ error: "Missing dslConfig, workflowId, or prompt" }, { status: 400 })
    }

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

    return NextResponse.json({
      invocationId,
      success: true,
    })
  } catch (error) {
    return NextResponse.json(
      {
        invocationId: "",
        success: false,
        error: error instanceof Error ? error.message : "Failed to start workflow execution",
      },
      { status: 500 },
    )
  }
}

async function executeWorkflowAsync(
  dslConfig: WorkflowConfig,
  workflowId: string,
  prompt: string,
  invocationId: string,
) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

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

    // Use the workflow invocation API instead of importing invokeWorkflow directly
    const invokeResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/workflow/invoke`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dslConfig,
          evalInput,
        }),
      },
    )

    const result = await invokeResponse.json()

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const invocationId = searchParams.get("invocationId")

    if (!invocationId) {
      return NextResponse.json({ error: "Missing invocationId parameter" }, { status: 400 })
    }

    const execution = asyncExecutions.get(invocationId)

    if (!execution) {
      return NextResponse.json(
        {
          success: false,
          error: "Execution not found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      execution,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get execution status",
      },
      { status: 500 },
    )
  }
}
