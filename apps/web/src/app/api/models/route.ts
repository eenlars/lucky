import { getActiveModelNames, getModelV2 } from "@lucky/core/utils/spending/functions"
import { getActiveModels, getModelsByProvider } from "@lucky/models"
import type { LuckyProvider } from "@lucky/shared"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, model, provider } = body

    if (action === "getActiveModelNames") {
      const models = getActiveModelNames(provider as LuckyProvider)
      return NextResponse.json({ models })
    }

    if (action === "getModelV2") {
      if (!model) {
        return NextResponse.json({ error: "Model name is required" }, { status: 400 })
      }
      const modelInfo = getModelV2(model, provider as LuckyProvider)
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
