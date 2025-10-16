import { requireAuth } from "@/lib/api-auth"
import { alrighty, fail, handleBody, isHandleBodyError } from "@/lib/api/server"
import { ensureCoreInit } from "@/lib/ensure-core-init"
import { logException } from "@/lib/error-logger"
import { formatErrorResponse, formatSuccessResponse } from "@/lib/mcp-invoke/response"
import { verifyWorkflowConfig } from "@lucky/core/utils/validation/workflow/verifyWorkflow"
import { clientWorkflowLoader } from "@lucky/core/workflow/setup/WorkflowLoader.client"
import { genShortId } from "@lucky/shared"
import { ErrorCodes } from "@lucky/shared/contracts/invoke"
import { type NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  const requestId = `workflow-verify-${genShortId()}`
  const startedAt = new Date().toISOString()

  try {
    // Require authentication
    const authResult = await requireAuth()
    if (authResult) return authResult

    // Ensure core is initialized
    ensureCoreInit()

    const body = await handleBody("workflow/verify", request)
    if (isHandleBodyError(body)) return body

    const { workflow, mode } = body as { workflow: any; mode?: string }

    if (!workflow) {
      return fail(
        "workflow/verify",
        "Workflow configuration is required",
        { code: "MISSING_WORKFLOW", status: 400 },
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
        return fail("workflow/verify", message, {
          code: "VALIDATION_FAILED",
          status: 400,
        })
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
    const message =
      error instanceof Error ? `Verification Error: ${error.message}` : "Unknown verification error"
    return fail("workflow/verify", message, { code: "VERIFICATION_ERROR", status: 500 })
  }
}
