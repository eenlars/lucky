import { calculateCostV2 } from "@core/messages/api/vercel/pricing/calculatePricing"
import type { TokenUsage } from "@lucky/core/utils/spending/models.types"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

interface CostCalculationRequest {
  model: string
  usage: {
    prompt_tokens?: number
    completion_tokens?: number
    cached_tokens?: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CostCalculationRequest = await request.json()
    const { model, usage } = body

    if (!model || !usage) {
      return NextResponse.json({ error: "Model and usage are required" }, { status: 400 })
    }

    const tokenUsage: TokenUsage = {
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      cachedInputTokens: usage.cached_tokens || 0,
    }

    const cost = calculateCostV2(model, tokenUsage)

    return NextResponse.json({
      cost,
      model,
      tokens: tokenUsage,
    })
  } catch (error) {
    console.error("Cost calculation error:", error)

    let errorMessage = "Failed to calculate cost"
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 },
    )
  }
}
