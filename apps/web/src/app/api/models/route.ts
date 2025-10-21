import { alrighty, handleBody, isHandleBodyError } from "@/lib/api/server"
import { getActiveGatewayModelIds } from "@lucky/core/utils/spending/functions"
import { findModel, getModelsByGateway, getRuntimeEnabledModels } from "@lucky/models"
import { gatewayNameSchema } from "@lucky/shared"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

// POST /api/models
// Fetches available models from the gateway's API and enriches with catalog metadata
// Body: { action: "getActiveGatewayModelIds" | "getModelV2" | "getModelsByGateway", gatewayModelId?: string, gateway?: string }
export async function POST(request: NextRequest) {
  const body = await handleBody("models", request)
  if (isHandleBodyError(body)) return body

  try {
    const { action, gatewayModelId, gateway } = body

    if (action === "getActiveGatewayModelIds") {
      if (!gateway) {
        return NextResponse.json({ error: "Gateway is required for getActiveGatewayModelIds" }, { status: 400 })
      }
      const validatedGateway = gatewayNameSchema.parse(gateway)
      const models = getActiveGatewayModelIds(validatedGateway)
      return alrighty("models", { models })
    }

    if (action === "getModelV2") {
      if (!gatewayModelId) {
        return NextResponse.json({ error: "Model ID is required" }, { status: 400 })
      }
      const modelInfo = findModel(gatewayModelId)
      if (!modelInfo) {
        return NextResponse.json({ error: "Model not found" }, { status: 404 })
      }
      return alrighty("models", { gatewayModelId: modelInfo })
    }

    if (action === "getModelsByGateway") {
      if (!gateway) {
        // Return all runtime-enabled models if no gateway specified
        const models = getRuntimeEnabledModels()
        return alrighty("models", { models })
      }
      // Return models for specific gateway
      const validatedGateway = gatewayNameSchema.parse(gateway)
      const models = getModelsByGateway(validatedGateway).filter(m => m.runtimeEnabled !== false)
      return alrighty("models", { models })
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'getActiveGatewayModelIds', 'getModelV2', or 'getModelsByGateway'" },
      { status: 400 },
    )
  } catch (error) {
    console.error("Models API error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
