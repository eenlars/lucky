import { createSecretResolver } from "@/features/secret-management/lib/secretResolver"
import { alrighty, fail, handleBody, isHandleBodyError } from "@/lib/api/server"
import { ensureCoreInit } from "@/lib/ensure-core-init"
import { logException } from "@/lib/error-logger"
import { getUserModels } from "@/lib/models/server-utils"
import { auth } from "@clerk/nextjs/server"
import { withExecutionContext } from "@lucky/core/context/executionContext"
import { PROVIDER_API_KEYS, PROVIDERS } from "@lucky/core/providers"
import { formalizeWorkflow } from "@lucky/core/workflow/actions/generate/formalizeWorkflow"
import type { AfterGenerationOptions, GenerationOptions } from "@lucky/core/workflow/actions/generate/generateWF.types"
import { DEFAULT_MODELS, createLLMRegistry, findModelById } from "@lucky/models"
import { type Principal, isNir } from "@lucky/shared"
import { type NextRequest, NextResponse } from "next/server"

const USER_PAYS_FOR_FORMALIZE = false

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
    const principal: Principal = {
      auth_method: "session",
      clerk_id: userId,
      scopes: [],
    }

    const secrets = createSecretResolver(userId, principal)

    // Fetch API keys (user's if paying, environment if free)
    const providerKeyNames = PROVIDERS.map(p => p.apiKeyName)
    const apiKeys = await secrets.getAll(providerKeyNames, "environment-variables")

    // Fetch user models only if paying
    let availableModels: Awaited<ReturnType<typeof getUserModels>> | undefined
    if (USER_PAYS_FOR_FORMALIZE) {
      availableModels = await getUserModels(userId)
    }

    // Build provider -> API key mapping for registry
    const fallbackKeys = Object.fromEntries(
      PROVIDER_API_KEYS.map(keyName => {
        const provider = keyName.replace(/_API_KEY$/, "").toLowerCase()
        return [provider, apiKeys[keyName]]
      }),
    )
    const registry = createLLMRegistry({ fallbackKeys })

    // Use default model if needed
    if (isNir(availableModels)) {
      const defaultModel = findModelById(DEFAULT_MODELS.openai.default)
      if (!defaultModel?.runtimeEnabled) {
        return fail("workflow/formalize", "No models available. Please configure API keys in Settings.", {
          code: "NO_MODELS_AVAILABLE",
          status: 400,
        })
      }
      availableModels = [defaultModel]
    }

    const modelIds = availableModels.map(m => m.id)
    const userModelsMode = USER_PAYS_FOR_FORMALIZE ? "byok" : "shared"
    const userModelsId = USER_PAYS_FOR_FORMALIZE ? userId : `system-${userId}`

    const userModelsInstance = registry.forUser({
      mode: userModelsMode,
      userId: userModelsId,
      models: modelIds,
    })

    const optionsWithModels: GenerationOptions & AfterGenerationOptions = {
      ...options,
      modelSelectionStrategy: {
        strategy: "user-models",
        models: availableModels,
      },
    }

    const validApiKeys = Object.fromEntries(Object.entries(apiKeys).filter(([, v]) => v)) as Record<string, string>

    const result = await withExecutionContext(
      { principal, secrets, apiKeys: validApiKeys, userModels: userModelsInstance },
      () => formalizeWorkflow(prompt, optionsWithModels),
    )

    return alrighty("workflow/formalize", result)
  } catch (error) {
    logException(error, { location: "/api/workflow/formalize" })
    const message = error instanceof Error ? error.message : "Failed to formalize workflow"
    return fail("workflow/formalize", message, { code: "FORMALIZE_ERROR", status: 500 })
  }
}
