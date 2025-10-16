import { calculateCostV2 } from "@core/messages/api/vercel/pricing/calculatePricing"
import { alrighty, fail, handleBody, isHandleBodyError } from "@/lib/api/server"
import type { TokenUsage } from "@lucky/shared"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await handleBody("test/calculate-cost", request)
    if (isHandleBodyError(body)) return body

    const { model, inputTokens, outputTokens } = body

    const tokenUsage: TokenUsage = {
      inputTokens,
      outputTokens,
      cachedInputTokens: 0,
    }

    const cost = calculateCostV2(model, tokenUsage)

    return alrighty("test/calculate-cost", {
      success: true,
      data: {
        cost,
        currency: "USD" as const
      },
      error: null
    })
  } catch (error) {
    console.error("Cost calculation error:", error)
    return fail("test/calculate-cost", error instanceof Error ? error.message : "Failed to calculate cost", {
      code: "CALCULATION_ERROR",
      status: 500
    })
  }
}
