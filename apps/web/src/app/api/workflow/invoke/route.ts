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
        return NextResponse.json({ error: result.error }, { status: 500 })
      }

      return NextResponse.json(result, { status: 200 })
    }

    // No context set, this is a direct call - authenticate and create context
    const principal = await authenticateRequest(req)
    if (!principal) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    console.log("[workflow/invoke] Principal auth_method:", principal.auth_method)
    console.log("[workflow/invoke] Principal clerk_id:", principal.clerk_id)

    const secrets = createSecretResolver(principal.clerk_id)

    // Pre-fetch common provider keys
    const apiKeys = await secrets.getAll(["OPENROUTER_API_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GROQ_API_KEY"])
    console.log("[workflow/invoke] Pre-fetched API keys:", Object.keys(apiKeys))
    console.log("[workflow/invoke] OPENROUTER_API_KEY present:", !!apiKeys.OPENROUTER_API_KEY)
    console.log("[workflow/invoke] OPENAI_API_KEY present:", !!apiKeys.OPENAI_API_KEY)

    // For session auth (UI users), validate required API keys BEFORE running workflow
    if (principal.auth_method === "session") {
      const missingKeys: string[] = []

      // Check which providers are actually needed (for now, check all common ones)
      // TODO: Parse workflow to determine exact providers needed
      if (!apiKeys.OPENROUTER_API_KEY && !process.env.OPENROUTER_API_KEY) {
        missingKeys.push("OPENROUTER_API_KEY")
      }
      if (!apiKeys.OPENAI_API_KEY && !process.env.OPENAI_API_KEY) {
        missingKeys.push("OPENAI_API_KEY")
      }

      if (missingKeys.length > 0) {
        console.error("[workflow/invoke] ❌ Missing required API keys for UI user:", missingKeys)
        return NextResponse.json(
          {
            error: "Missing API Keys",
            message: `You need to configure API keys before running workflows: ${missingKeys.join(", ")}`,
            missingKeys,
            action: "Go to Settings > Provider Settings to add your API keys",
          },
          { status: 400 },
        )
      }
    }

    const result = await withExecutionContext({ principal, secrets, apiKeys }, async () => {
      return invokeWorkflow(input)
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("Workflow Invocation API Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
