import { alrighty, fail, handleBody, isHandleBodyError } from "@/lib/api/server"
import { ensureCoreInit } from "@/lib/ensure-core-init"
import { logException } from "@/lib/error-logger"
import { getUserModels } from "@/lib/models/server-utils"
import { auth } from "@clerk/nextjs/server"
import { formalizeWorkflow } from "@lucky/core/workflow/actions/generate/formalizeWorkflow"
import type { AfterGenerationOptions, GenerationOptions } from "@lucky/core/workflow/actions/generate/generateWF.types"
import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import type { RS } from "@lucky/shared"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  // Require authentication
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

  // Ensure core is initialized
  ensureCoreInit()

  const body = await handleBody("workflow/formalize", req)
  if (isHandleBodyError(body)) return body

  const { prompt, options } = body as {
    prompt: string
    options: GenerationOptions & AfterGenerationOptions
  }

  if (!prompt) {
    return fail("workflow/formalize", "Missing prompt parameter", {
      code: "MISSING_PROMPT",
      status: 400,
    })
  }

  try {
    // Fetch user's available models from database
    const availableModels = await getUserModels(userId)

    // Merge user's available models into options
    const optionsWithModels: GenerationOptions & AfterGenerationOptions = {
      ...options,
      modelSelectionStrategy: {
        strategy: "user-models",
        models: availableModels,
      },
    }

    const result: RS<WorkflowConfig> = await formalizeWorkflow(prompt, optionsWithModels)

    return alrighty("workflow/formalize", result)
  } catch (error) {
    logException(error, {
      location: "/api/workflow/formalize",
    })
    const message = error instanceof Error ? error.message : "Failed to formalize workflow"
    return fail("workflow/formalize", message, { code: "FORMALIZE_ERROR", status: 500 })
  }
}
