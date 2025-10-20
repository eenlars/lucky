import { getUserModelsSetup } from "@/features/provider-llm-setup/lib/user-models-get"
import { getServerLLMRegistry } from "@/features/provider-llm-setup/llm-registry"
import { alrighty, fail, handleBody, isHandleBodyError } from "@/lib/api/server"
import { ensureCoreInit } from "@/lib/ensure-core-init"
import { logException } from "@/lib/error-logger"
import { auth } from "@clerk/nextjs/server"
import { withExecutionContext } from "@lucky/core/context/executionContext"
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

  const body = await handleBody("modify-workflow", req)
  if (isHandleBodyError(body)) return body

  const { prompt, options } = body as {
    prompt: string
    options: GenerationOptions & AfterGenerationOptions
  }

  if (!prompt) {
    return fail("modify-workflow", "Missing prompt parameter", {
      code: "MISSING_PROMPT",
      status: 400,
    })
  }

  try {
    // Fetch user's available models from database
    const availableModels = await getUserModelsSetup({ clerkId: userId })

    // Merge user's available models into options
    const optionsWithModels: GenerationOptions & AfterGenerationOptions = {
      ...options,
      modelSelectionStrategy: {
        strategy: "user-models",
        models: availableModels,
      },
    }

    // Create a minimal secret resolver (system uses process.env directly, not lockbox)
    const secrets = {
      async get() {
        return undefined
      },
      async getAll() {
        return {}
      },
    }

    const llmRegistry = getServerLLMRegistry()

    const userModels = llmRegistry.forUser({
      mode: "shared",
      userId: userId,
      models: availableModels.map(m => m.id),
    })

    // Run formalizeWorkflow with execution context using shared system keys
    const result: RS<WorkflowConfig> = await withExecutionContext(
      {
        principal: { clerk_id: userId, auth_method: "session", scopes: [] },
        secrets,
        userModels,
      },
      async () => {
        return await formalizeWorkflow(prompt, optionsWithModels)
      },
    )

    return alrighty("modify-workflow", result)
  } catch (error) {
    logException(error, {
      location: "/api/modify-workflow",
    })
    const message = error instanceof Error ? error.message : "Failed to modify workflow"
    return fail("modify-workflow", message, { code: "MODIFY_WORKFLOW_ERROR", status: 500 })
  }
}
