import { getActiveModelNames } from "@lucky/core/utils/spending/functions"
import { findModelByName, getActiveModels, getModelsByProvider } from "@lucky/models"
import { alrighty, fail, handleBody, isHandleBodyError } from "@/lib/api/server"
import { type NextRequest } from "next/server"
import { providerNameSchema } from "packages/shared/dist/client"

export const runtime = "nodejs"

// POST /api/models
// Fetches available models from the provider's API and enriches with catalog metadata
// Body: { action: "getActiveModelNames" | "getModelV2" | "getModelsByProvider", model?: string, provider: string }
export async function POST(request: NextRequest) {
  const body = await handleBody("models", request)
  if (isHandleBodyError(body)) return body

  try {
    const { action, model, provider } = body

    const validatedProvider = providerNameSchema.parse(provider)
    if (!validatedProvider) {
      return fail("models", "Invalid provider", { code: "INVALID_PROVIDER", status: 400 })
    }

    if (action === "getActiveModelNames") {
      const models = getActiveModelNames(validatedProvider)
      return alrighty("models", { models })
    }

    if (action === "getModelV2") {
      if (!model) {
        return fail("models", "Model name is required", { code: "MISSING_MODEL", status: 400 })
      }
      const modelInfo = findModelByName(model)
      if (!modelInfo) {
        return fail("models", "Model not found", { code: "MODEL_NOT_FOUND", status: 404 })
      }
      return alrighty("models", { model: modelInfo })
    }

    if (action === "getModelsByProvider") {
      if (!provider) {
        // Return all active models if no provider specified
        const models = getActiveModels()
        return alrighty("models", { models })
      }
      // Return models for specific provider
      const models = getModelsByProvider(provider).filter(m => m.active)
      return alrighty("models", { models })
    }

    return fail(
      "models",
      "Invalid action. Use 'getActiveModelNames', 'getModelV2', or 'getModelsByProvider'",
      { code: "INVALID_ACTION", status: 400 },
    )
  } catch (error) {
    console.error("Models API error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return fail("models", message, { code: "INTERNAL_ERROR", status: 500 })
  }
}
