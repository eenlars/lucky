import { requireAuth } from "@/lib/api-auth"
import { ensureCoreInit } from "@/lib/ensure-core-init"
import { verifyWorkflowConfig } from "@lucky/core/utils/validation/workflow/verifyWorkflow"
import { clientWorkflowLoader } from "@lucky/core/workflow/setup/WorkflowLoader.client"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult

    // Ensure core is initialized
    ensureCoreInit()

    const { workflow, mode } = await request.json()

    if (!workflow) {
      return NextResponse.json({ error: "Workflow configuration is required" }, { status: 400 })
    }

    // Handle different validation modes
    if (mode === "dsl" || mode === "dsl-display") {
      // Validate DSL config with Zod schemas (replaces client-side loadFromDSLClient)
      try {
        const validated =
          mode === "dsl-display"
            ? await clientWorkflowLoader.loadFromDSLDisplay(workflow)
            : await clientWorkflowLoader.loadFromDSL(workflow)
        return NextResponse.json({ isValid: true, config: validated })
      } catch (error) {
        return NextResponse.json(
          {
            isValid: false,
            errors: [error instanceof Error ? error.message : "Invalid DSL configuration"],
          },
          { status: 400 },
        )
      }
    }

    // Default: full workflow verification
    const result = await verifyWorkflowConfig(workflow, {
      throwOnError: false,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Workflow verification error:", error)

    return NextResponse.json(
      {
        isValid: false,
        errors: [error instanceof Error ? `Verification Error: ${error.message}` : "Unknown verification error"],
      },
      { status: 500 },
    )
  }
}
