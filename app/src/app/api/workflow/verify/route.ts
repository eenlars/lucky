import { verifyWorkflowConfig } from "@core/utils/validation/workflow"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { workflow } = await request.json()

    if (!workflow) {
      return NextResponse.json({ error: "Workflow configuration is required" }, { status: 400 })
    }

    const result = await verifyWorkflowConfig(workflow, { throwOnError: false })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Workflow verification error:", error)

    return NextResponse.json(
      {
        isValid: false,
        errors: [error instanceof Error ? `Verification Error: ${error.message}` : "Unknown verification error"],
      },
      { status: 500 }
    )
  }
}
