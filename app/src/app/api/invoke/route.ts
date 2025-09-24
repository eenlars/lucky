// app/src/app/api/invoke/route.ts
// Simple prompt invocation for frontend

import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { invokeWorkflowWithPrompt } from "@core/workflow/runner/invokeWorkflow"

export async function POST(req: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult

    const body = await req.json()
    const { 
      workflowVersionId, 
      prompt, 
      options = {} 
    } = body as {
      workflowVersionId: string
      prompt: string
      options?: {
        goal?: string
        skipEvaluation?: boolean
        skipPreparation?: boolean
        tools?: string[]
        maxCost?: number
      }
    }

    // Basic validation
    if (!workflowVersionId || !prompt) {
      return NextResponse.json(
        { error: "Missing workflowVersionId or prompt" },
        { status: 400 }
      )
    }

    if (prompt.length > 50000) {
      return NextResponse.json(
        { error: "Prompt too long (max 50,000 characters)" },
        { status: 400 }
      )
    }

    // Use the simple prompt invocation
    const result = await invokeWorkflowWithPrompt(
      workflowVersionId,
      prompt,
      options
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Invocation failed" },
        { status: 500 }
      )
    }

    // Return the result
    return NextResponse.json(result.data, { status: 200 })

  } catch (error) {
    console.error("Prompt invocation API Error:", error)
    return NextResponse.json(
      { error: "Failed to process prompt request" },
      { status: 500 }
    )
  }
}
