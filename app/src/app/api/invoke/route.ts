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

    // Validate required fields
    if (!workflowVersionId || typeof workflowVersionId !== 'string' || workflowVersionId.trim().length === 0) {
      return NextResponse.json(
        { error: "Invalid or missing workflowVersionId" },
        { status: 400 }
      )
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Invalid or missing prompt" },
        { status: 400 }
      )
    }

    if (prompt.length > 50000) {
      return NextResponse.json(
        { error: "Prompt too long (max 50,000 characters)" },
        { status: 400 }
      )
    }

    // Generate unique workflow ID for this prompt-only invocation
    const workflowId = `prompt-only-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const input = {
      workflowVersionId: workflowVersionId.trim(),
      evalInput: {
        type: "prompt-only",
        goal: prompt.trim(),
        workflowId,
      },
    }

    // Call the workflow invocation API instead of importing invokeWorkflow directly
    const invokeResponse = await fetch(`${req.nextUrl.origin}/api/workflow/invoke`, {
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
      return NextResponse.json(
        { error: errorData.error },
        { status: invokeResponse.status }
      )
    }

    const result = await invokeResponse.json()
    return NextResponse.json(result.data, { status: 200 })
  } catch (error) {
    console.error("Prompt-only API Error:", error)
    return NextResponse.json(
      { error: "Failed to process prompt-only request" },
      { status: 500 }
    )
  }
}
