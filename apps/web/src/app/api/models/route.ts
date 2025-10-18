import { alrighty, handleBody, isHandleBodyError } from "@/lib/api/server"
import { getActiveModelNames } from "@lucky/core/utils/spending/functions"
import { findModelByName, getModelsByProvider, getRuntimeEnabledModels } from "@lucky/models"
import { providerNameSchema } from "@lucky/shared"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

// POST /api/models
// Fetches available models from the provider's API and enriches with catalog metadata
// Body: { action: "getActiveModelNames" | "getModelV2" | "getModelsByProvider", model?: string, provider: string }
export async function POST(request: NextRequest) {
  const body = await handleBody("models", request)
  if (isHandleBodyError(body)) return body

  try {
    const { action, model, provider } = body

    if (action === "getActiveModelNames") {
      if (!provider) {
        return NextResponse.json({ error: "Provider is required for getActiveModelNames" }, { status: 400 })
      }
      const validatedProvider = providerNameSchema.parse(provider)
      const models = getActiveModelNames(validatedProvider)
      return alrighty("models", { models })
    }

    if (action === "getModelV2") {
      if (!model) {
        return NextResponse.json({ error: "Model name is required" }, { status: 400 })
      }
      const modelInfo = findModelByName(model)
      if (!modelInfo) {
        return NextResponse.json({ error: "Model not found" }, { status: 404 })
      }
      return alrighty("models", { model: modelInfo })
    }

    if (action === "getModelsByProvider") {
      if (!provider) {
        // Return all runtime-enabled models if no provider specified
        const models = getRuntimeEnabledModels()
        return alrighty("models", { models })
      }
      // Return models for specific provider
      const validatedProvider = providerNameSchema.parse(provider)
      const models = getModelsByProvider(validatedProvider).filter(m => m.runtimeEnabled)
      return alrighty("models", { models })
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'getActiveModelNames', 'getModelV2', or 'getModelsByProvider'" },
      { status: 400 },
    )
  } catch (error) {
    console.error("Models API error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
