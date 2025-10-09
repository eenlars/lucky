import { requireAuth } from "@/lib/api-auth"
import { ApiKeyResolver } from "@/lib/auth/ApiKeyResolver"
import { ensureCoreInit } from "@/lib/ensure-core-init"
import { createRLSClient } from "@/lib/supabase/server-rls"
import type { UserExecutionContext } from "@lucky/core/auth/types"
import { invokeWorkflow } from "@lucky/core/workflow/runner/invokeWorkflow"
import type { InvocationInput } from "@lucky/core/workflow/runner/types"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const clerkId = authResult

  // Ensure core is initialized
  ensureCoreInit()

  try {
    const body = await req.json()
    const input = body as InvocationInput

    if (!input) {
      return NextResponse.json({ error: "Invalid invocation input" }, { status: 400 })
    }

    // Create user execution context for API key resolution
    const supabase = await createRLSClient()
    const apiKeyResolver = new ApiKeyResolver(clerkId, supabase)

    const userContext: UserExecutionContext = {
      clerkId,
      apiKeyResolver,
    }

    // Invoke workflow with user context
    const result = await invokeWorkflow(input, userContext)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("Workflow Invocation API Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
