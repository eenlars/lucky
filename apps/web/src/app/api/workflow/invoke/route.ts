import { authenticateRequest } from "@/lib/auth/principal"
import { ensureCoreInit } from "@/lib/ensure-core-init"
import { createSecretResolver } from "@/lib/lockbox/secretResolver"
import { getExecutionContext, withExecutionContext } from "@lucky/core/context/executionContext"
import { invokeWorkflow } from "@lucky/core/workflow/runner/invokeWorkflow"
import type { InvocationInput } from "@lucky/core/workflow/runner/types"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  // Ensure core is initialized
  ensureCoreInit()

  try {
    const body = await req.json()
    const input = body as InvocationInput

    if (!input) {
      return NextResponse.json({ error: "Invalid invocation input" }, { status: 400 })
    }

    // Check if we already have execution context (from upstream caller like /api/v1/invoke)
    const existingContext = getExecutionContext()

    if (existingContext) {
      // Context already set, just invoke
      const result = await invokeWorkflow(input)

      if (!result.success) {
        console.error("[/api/workflow/invoke] Workflow invocation failed:", result.error)
        return NextResponse.json({ error: result.error }, { status: 500 })
      }

      return NextResponse.json(result, { status: 200 })
    }

    // No context set, this is a direct call - authenticate and create context
    const principal = await authenticateRequest(req)
    if (!principal) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const secrets = createSecretResolver(principal.clerk_id)

    // Pre-fetch common provider keys
    const apiKeys = await secrets.getAll(["OPENROUTER_API_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GROQ_API_KEY"])

    const result = await withExecutionContext({ principal, secrets, apiKeys }, async () => {
      return invokeWorkflow(input)
    })

    if (!result.success) {
      console.error("[/api/workflow/invoke] Workflow invocation failed:", result.error)
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("[/api/workflow/invoke] Unexpected error:", error)
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error"
    const errorStack = error instanceof Error ? error.stack : undefined
    if (errorStack) {
      console.error("[/api/workflow/invoke] Stack trace:", errorStack)
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
