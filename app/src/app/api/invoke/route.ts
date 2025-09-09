// app/src/app/api/invoke/route.ts

import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"

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

    //a1373554

    if (!workflowVersionId || !prompt) {
      return NextResponse.json(
        { error: "Missing workflowVersionId or prompt" },
        { status: 400 }
      )
    }

    const input = {
      workflowVersionId,
      evalInput: {
        type: "prompt-only",
        goal: prompt,
        workflowId: "dummy-workflow-id",
      },
    }

    // Call the workflow invocation API instead of importing invokeWorkflow directly
    const invokeResponse = await fetch(
      `${req.nextUrl.origin}/api/workflow/invoke`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      }
    )

    if (!invokeResponse.ok) {
      const errorData = await invokeResponse.json()
      return NextResponse.json(
        { error: errorData.error },
        { status: invokeResponse.status }
      )
    }

    const result = await invokeResponse.json()
    return NextResponse.json(result.data, { status: 200 })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
