import { alrighty, fail, handleBody, isHandleBodyError } from "@/lib/api/server"
import { calculateCostV2 } from "@core/messages/api/vercel/pricing/calculatePricing"
import type { TokenUsage } from "@lucky/shared"
import type { NextRequest } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await handleBody("test/calculate-cost", request)
    if (isHandleBodyError(body)) return body

    const { gatewayModelId, inputTokens, outputTokens, usage } = body

    // Accept both formats: flat {inputTokens, outputTokens} OR {usage: {...}}
    const tokenUsage: TokenUsage = usage || {
      inputTokens: inputTokens || 0,
      outputTokens: outputTokens || 0,
      cachedInputTokens: 0,
    }

    const cost = calculateCostV2(gatewayModelId, tokenUsage)

    // Return flat structure (cost and currency at top level)
    return alrighty("test/calculate-cost", {
      cost,
      currency: "USD" as const,
    })
  } catch (error) {
    console.error("Cost calculation error:", error)
    return fail("test/calculate-cost", error instanceof Error ? error.message : "Failed to calculate cost", {
      code: "CALCULATION_ERROR",
      status: 500,
    })
  }
}
