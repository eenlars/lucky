// app/src/app/api/invoke/route.ts

import { alrighty, fail, handleBody, isHandleBodyError } from "@/lib/api/server"
import { auth } from "@clerk/nextjs/server"
import { genShortId } from "@lucky/shared/client"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    // Require authentication
    const { isAuthenticated } = await auth()
    if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

    // Validate request body using type-safe schema
    const body = await handleBody("invoke", req)
    if (isHandleBodyError(body)) return body
    // body is now fully typed as { workflowVersionId: string, prompt: string }

    // Generate unique workflow ID for this prompt-only invocation
    const workflowId = `prompt_only_${genShortId()}`

    const input = {
      workflowVersionId: body.workflowVersionId,
      evalInput: {
        type: "prompt-only" as const,
        goal: body.prompt,
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

    const result = await invokeResponse.json()

    // Handle response format (could be success or error envelope)
    if ("error" in result && result.error) {
      return fail("invoke", result.error.message || "Workflow invocation failed", {
        code: "INVOKE_ERROR",
        status: invokeResponse.status || 500,
      })
    }

    // Extract output from result (handle both enveloped and direct responses)
    const output = result.data?.output || result.result?.output || result
    return alrighty("invoke", { success: true, data: output, error: null })
  } catch (error) {
    console.error("Prompt-only API Error:", error)
    return fail("invoke", "Failed to process prompt-only request", {
      code: "INTERNAL_ERROR",
      status: 500,
    })
  }
}
