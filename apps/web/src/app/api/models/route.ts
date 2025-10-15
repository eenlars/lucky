import { getActiveModelNames } from "@lucky/core/utils/spending/functions"
import { findModelByName, getActiveModels, getModelsByProvider } from "@lucky/models"
import { type NextRequest, NextResponse } from "next/server"
import { providerNameSchema } from "packages/shared/dist/client"

export const runtime = "nodejs"

// POST /api/models
// Fetches available models from the provider's API and enriches with catalog metadata
// Body: { action: "getActiveModelNames" | "getModelV2" | "getModelsByProvider", model?: string, provider: string }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, model, provider } = body

    const validatedProvider = providerNameSchema.parse(provider)
    if (!validatedProvider) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
    }

    if (action === "getActiveModelNames") {
      const models = getActiveModelNames(validatedProvider)
      return NextResponse.json({ models })
    }

    if (action === "getModelV2") {
      if (!model) {
        return NextResponse.json({ error: "Model name is required" }, { status: 400 })
      }
      const modelInfo = findModelByName(model)
      if (!modelInfo) {
        return NextResponse.json({ error: "Model not found" }, { status: 404 })
      }
      return NextResponse.json({ model: modelInfo })
    }

    if (action === "getModelsByProvider") {
      if (!provider) {
        // Return all active models if no provider specified
        const models = getActiveModels()
        return NextResponse.json({ models })
      }
      // Return models for specific provider
      const models = getModelsByProvider(provider).filter(m => m.active)
      return NextResponse.json({ models })
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'getActiveModelNames', 'getModelV2', or 'getModelsByProvider'" },
      { status: 400 },
    )
  } catch (error) {
    console.error("Models API error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
