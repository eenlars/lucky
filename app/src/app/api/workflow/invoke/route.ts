import { invokeWorkflow } from "@core/workflow/runner/invokeWorkflow"
import type { InvocationInput } from "@core/workflow/runner/types"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { ensureCoreInit } from "@/lib/ensure-core-init"

export async function POST(req: NextRequest) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  // Ensure core is initialized
  ensureCoreInit()

  try {
    const body = await req.json()
    const input = body as InvocationInput

    if (!input) {
      return NextResponse.json({ error: "Invalid invocation input" }, { status: 400 })
    }

    const result = await invokeWorkflow(input)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("Workflow Invocation API Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
