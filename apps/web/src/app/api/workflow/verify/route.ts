import { requireAuth } from "@/lib/api-auth"
import { ensureCoreInit } from "@/lib/ensure-core-init"
import { logException } from "@/lib/error-logger"
import { formatErrorResponse, formatSuccessResponse } from "@/lib/mcp-invoke/response"
import { verifyWorkflowConfig } from "@lucky/core/utils/validation/workflow/verifyWorkflow"
import { clientWorkflowLoader } from "@lucky/core/workflow/setup/WorkflowLoader.client"
import { genShortId } from "@lucky/shared"
import { ErrorCodes } from "@lucky/shared/contracts/invoke"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const requestId = `workflow-verify-${genShortId()}`
  const startedAt = new Date().toISOString()

  try {
    // Require authentication
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult

    // Ensure core is initialized
    ensureCoreInit()

    const { workflow, mode } = await request.json()

    if (!workflow) {
      return NextResponse.json(
        formatErrorResponse(requestId, {
          code: ErrorCodes.INVALID_REQUEST,
          message: "Workflow configuration is required",
        }),
        { status: 400 },
      )
    }

    // Handle different validation modes
    if (mode === "dsl" || mode === "dsl-display") {
      // Validate DSL config with Zod schemas (replaces client-side loadFromDSLClient)
      try {
        const validated =
          mode === "dsl-display"
            ? await clientWorkflowLoader.loadFromDSLDisplay(workflow)
            : await clientWorkflowLoader.loadFromDSL(workflow)
        const finishedAt = new Date().toISOString()
        return NextResponse.json(
          formatSuccessResponse(
            requestId,
            { isValid: true, config: validated },
            {
              requestId,
              workflowId: "verify",
              startedAt,
              finishedAt,
            },
          ),
        )
      } catch (error) {
        return NextResponse.json(
          formatErrorResponse(requestId, {
            code: ErrorCodes.INPUT_VALIDATION_FAILED,
            message: error instanceof Error ? error.message : "Invalid DSL configuration",
            data: { isValid: false, errors: [error instanceof Error ? error.message : "Invalid DSL configuration"] },
          }),
          { status: 400 },
        )
      }
    }

    // Default: full workflow verification
    const result = await verifyWorkflowConfig(workflow, {
      throwOnError: false,
    })

    const finishedAt = new Date().toISOString()
    return NextResponse.json(
      formatSuccessResponse(requestId, result, {
        requestId,
        workflowId: "verify",
        startedAt,
        finishedAt,
      }),
    )
  } catch (error) {
    logException(error, {
      location: "/api/workflow/verify",
    })
    console.error("Workflow verification error:", error)
    return NextResponse.json(
      formatErrorResponse(requestId, {
        code: ErrorCodes.INTERNAL_ERROR,
        message: error instanceof Error ? `Verification Error: ${error.message}` : "Unknown verification error",
        data: {
          isValid: false,
          errors: [error instanceof Error ? `Verification Error: ${error.message}` : "Unknown verification error"],
        },
      }),
      { status: 500 },
    )
  }
}
