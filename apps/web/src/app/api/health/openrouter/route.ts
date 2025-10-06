import { errorResponse } from "@/lib/api-errors"
import { createCredentialError } from "@lucky/core/utils/config/credential-errors"
import { NextResponse } from "next/server"

type OpenRouterResponse = {
  data: {
    label: string
    usage: number // Number of credits used
    limit: number | null // Credit limit for the key, or null if unlimited
    is_free_tier: boolean // Whether the user has paid for credits before
  }
}

export async function GET() {
  try {
    const key = process.env.OPENROUTER_API_KEY

    if (!key) {
      const error = createCredentialError("OPENROUTER_API_KEY")
      return NextResponse.json(
        {
          error: "OpenRouter not configured",
          code: error.details.code,
          credential: error.details.credential,
          message: error.details.userMessage,
          docsUrl: error.details.setupUrl,
        },
        { status: 503 },
      )
    }

    const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
      },
    })

    if (!response.ok) {
      return errorResponse(`OpenRouter API returned ${response.status}: ${response.statusText}`, response.status)
    }

    const data: OpenRouterResponse = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Failed to check OpenRouter status", 500)
  }
}
