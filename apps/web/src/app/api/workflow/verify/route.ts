import { alrighty, fail, handleBody, isHandleBodyError } from "@/lib/api/server"
import { ensureCoreInit } from "@/lib/ensure-core-init"
import { logException } from "@/lib/error-logger"
import { auth } from "@clerk/nextjs/server"
import { verifyWorkflowConfig } from "@lucky/core/utils/validation/workflow/verifyWorkflow"
import { clientWorkflowLoader } from "@lucky/core/workflow/setup/WorkflowLoader.client"
import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const { isAuthenticated } = await auth()
    if (!isAuthenticated) return fail("workflow/verify", "not auth", { status: 401 })

    // Ensure core is initialized
    ensureCoreInit()

    const body = await handleBody("workflow/verify", request)
    if (isHandleBodyError(body)) return body

    const { workflow, mode } = body as { workflow: any; mode?: string }

    if (!workflow) {
      return fail("workflow/verify", "no workflow found")
    }

    // Handle different validation modes
    if (mode === "dsl" || mode === "dsl-display") {
      // Validate DSL config with Zod schemas (replaces client-side loadFromDSLClient)
      try {
        const validated =
          mode === "dsl-display"
            ? await clientWorkflowLoader.loadFromDSLDisplay(workflow)
            : await clientWorkflowLoader.loadFromDSL(workflow)
        return alrighty("workflow/verify", { success: true, data: { isValid: true, errors: [] } })
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid DSL configuration"
        return fail("workflow/verify", message, { code: "INVALID_PARAMS" })
      }
    }

    // Default: full workflow verification
    const result = await verifyWorkflowConfig(workflow, {
      throwOnError: false,
    })

    return alrighty("workflow/verify", { success: true, data: result })
  } catch (error) {
    logException(error, {
      location: "/api/workflow/verify",
    })
    console.error("Workflow verification error:", error)
    const message = error instanceof Error ? `Verification Error: ${error.message}` : "Unknown verification error"
    return fail("workflow/verify", message, { code: "INTERNAL_ERROR" })
  }
}
