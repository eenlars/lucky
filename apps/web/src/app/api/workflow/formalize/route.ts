import { createSecretResolver } from "@/features/secret-management/lib/secretResolver"
import { alrighty, fail, handleBody, isHandleBodyError } from "@/lib/api/server"
import { ensureCoreInit } from "@/lib/ensure-core-init"
import { logException } from "@/lib/error-logger"
import { getUserModels } from "@/lib/models/server-utils"
import { auth } from "@clerk/nextjs/server"
import { withExecutionContext } from "@lucky/core/context/executionContext"
import { formalizeWorkflow } from "@lucky/core/workflow/actions/generate/formalizeWorkflow"
import type { AfterGenerationOptions, GenerationOptions } from "@lucky/core/workflow/actions/generate/generateWF.types"
import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import { createLLMRegistry } from "@lucky/models"
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
    // Create execution context with user's secrets for API key resolution
    const principal = {
      auth_method: "session" as const,
      clerk_id: userId,
      scopes: [] as string[],
    }
    const secrets = createSecretResolver(userId, principal)

    // Fetch all API keys from secrets
    const apiKeys = await secrets.getAll(
      ["OPENAI_API_KEY", "GROQ_API_KEY", "OPENROUTER_API_KEY"],
      "environment-variables",
    )

    // Create LLM registry with fetched API keys
    const registry = createLLMRegistry({
      fallbackKeys: {
        openai: apiKeys.OPENAI_API_KEY,
        groq: apiKeys.GROQ_API_KEY,
        openrouter: apiKeys.OPENROUTER_API_KEY,
      },
    })

    // Fetch user's available models from database
    let availableModels = await getUserModels(userId)

    // For new workflow creation (no base workflow), ensure we have a fallback model
    const isNewWorkflow = options.workflowConfig === null || options.workflowConfig === undefined
    if (isNewWorkflow && availableModels.length === 0) {
      // Provide a bulletproof default model for first-time workflow creation
      const { findModel } = await import("@lucky/models")
      const defaultModel = findModel("openai#gpt-4o-mini")
      if (defaultModel?.runtimeEnabled) {
        availableModels = [defaultModel]
      } else {
        return fail("workflow/formalize", "No models available. Please configure API keys in Settings.", {
          code: "NO_MODELS_AVAILABLE",
          status: 400,
        })
      }
    }

    // Extract model IDs for UserModels instance
    const modelIds = availableModels.map(m => m.id)

    // Create UserModels instance for execution context
    const userModelsInstance = registry.forUser({
      mode: "shared",
      userId: `system-${userId}`,
      models: modelIds,
    })

    // Merge user's available models into options (uses ModelEntry[] for strategy)
    const optionsWithModels: GenerationOptions & AfterGenerationOptions = {
      ...options,
      modelSelectionStrategy: {
        strategy: "user-models",
        models: availableModels,
      },
    }

    const result: RS<WorkflowConfig> = await withExecutionContext(
      {
        principal,
        secrets,
        apiKeys,
        userModels: userModelsInstance,
      },
      async () => await formalizeWorkflow(prompt, optionsWithModels),
    )

    return alrighty("workflow/formalize", result)
  } catch (error) {
    logException(error, {
      location: "/api/workflow/formalize",
    })
    const message = error instanceof Error ? error.message : "Failed to formalize workflow"
    return fail("workflow/formalize", message, { code: "FORMALIZE_ERROR", status: 500 })
  }
}
