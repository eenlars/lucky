import { formatErrorResponse, formatSuccessResponse } from "@/features/workflow-invocation/lib"
import { alrighty, fail, handleBody, isHandleBodyError } from "@/lib/api/server"
import { ensureCoreInit } from "@/lib/ensure-core-init"
import { logException } from "@/lib/error-logger"
import { auth } from "@clerk/nextjs/server"
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
    const { isAuthenticated } = await auth()
    if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

    // Ensure core is initialized
    ensureCoreInit()

    const body = await handleBody("workflow/verify", request)
    if (isHandleBodyError(body)) return body

    const { workflow, mode } = body as { workflow: any; mode?: string }

    if (!workflow) {
      return alrighty(
        "workflow/verify",
        formatErrorResponse(requestId, {
          code: ErrorCodes.INVALID_PARAMS,
          message: "Workflow configuration is required",
        }),
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
        return alrighty(
          "workflow/verify",
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
        const message = error instanceof Error ? error.message : "Invalid DSL configuration"
        return alrighty(
          "workflow/verify",
          formatErrorResponse(requestId, {
            code: ErrorCodes.INVALID_PARAMS,
            message,
          }),
        )
      }
    }

    // Default: full workflow verification
    const result = await verifyWorkflowConfig(workflow, {
      throwOnError: false,
    })

    const finishedAt = new Date().toISOString()
    return alrighty(
      "workflow/verify",
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
    const message = error instanceof Error ? `Verification Error: ${error.message}` : "Unknown verification error"
    return alrighty(
      "workflow/verify",
      formatErrorResponse(requestId, {
        code: ErrorCodes.INTERNAL_ERROR,
        message,
      }),
    )
  }
}
