import { invokeWorkflow } from "@core/workflow/runner/invokeWorkflow"
import type { InvocationInput } from "@core/workflow/runner/types"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { initializeObservability } from "@core/utils/observability/setup"

export async function POST(req: NextRequest) {
  // Initialize observability system for real-time event streaming
  initializeObservability({
    enableConsoleLogging: true,
    enableSSEStreaming: true,
  })

  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = await req.json()
    const input = body as InvocationInput

    if (!input) {
      return NextResponse.json(
        { error: "Invalid invocation input" },
        { status: 400 }
      )
    }

    const result = await invokeWorkflow(input)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Return result with invocation IDs for real-time event subscription
    const response = {
      ...result,
      invocationIds: result.data?.map((r) => r.workflowInvocationId) || [],
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("Workflow Invocation API Error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
