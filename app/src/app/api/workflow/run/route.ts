import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import type { EvaluationText } from "@core/workflow/ingestion/ingestion.types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"

export async function POST(req: NextRequest) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = await req.json()
    const { dslConfig, workflowId, prompt } = body as {
      dslConfig: WorkflowConfig
      workflowId: string
      prompt?: string
    }

    if (!dslConfig || !workflowId) {
      return NextResponse.json({ error: "Missing dslConfig or workflowId" }, { status: 400 })
    }

    const evalInput: EvaluationText = {
      workflowId,
      type: "text" as const,
      question: prompt || "Test execution",
      answer: "Expected output",
      goal: "Execute workflow with user prompt",
    }

    // Use the existing workflow invoke API
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
      }
    )

    if (!invokeResponse.ok) {
      const errorText = await invokeResponse.text()
      throw new Error(`Workflow invoke failed: ${invokeResponse.status} - ${errorText}`)
    }

    const result = await invokeResponse.json()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to run workflow",
        data: undefined,
        usdCost: 0,
      },
      { status: 500 }
    )
  }
}
