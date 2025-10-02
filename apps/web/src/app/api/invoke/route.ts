// app/src/app/api/invoke/route.ts

import { requireAuth } from "@/lib/api-auth"
import { genShortId } from "@lucky/core/utils/common/utils"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const body = await req.json()
    const { workflowVersionId, prompt } = body as {
      workflowVersionId: string
      prompt: string
    }

    // Basic null checks - detailed validation happens in core layer
    if (!workflowVersionId || !prompt) {
      return NextResponse.json({ error: "Missing workflowVersionId or prompt" }, { status: 400 })
    }

    // Generate unique workflow ID for this prompt-only invocation
    const workflowId = `prompt_only_${genShortId()}`

    const input = {
      workflowVersionId,
      evalInput: {
        type: "prompt-only",
        goal: prompt,
        workflowId,
      },
    }

    // Call the workflow invocation API instead of importing invokeWorkflow directly
    // Use localhost to prevent SSRF attacks
    const invokeResponse = await fetch(`http://localhost:${process.env.PORT || 3000}/api/workflow/invoke`, {
      method: "POST",
      // Forward auth cookies so the nested API call remains authenticated
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") ?? "",
      },
      body: JSON.stringify(input),
    })

    if (!invokeResponse.ok) {
      const errorData = await invokeResponse.json()
      return NextResponse.json({ error: errorData.error }, { status: invokeResponse.status })
    }

    const result = await invokeResponse.json()
    return NextResponse.json(result.data, { status: 200 })
  } catch (error) {
    console.error("Prompt-only API Error:", error)
    return NextResponse.json({ error: "Failed to process prompt-only request" }, { status: 500 })
  }
}
