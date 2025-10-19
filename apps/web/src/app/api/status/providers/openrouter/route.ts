import { alrighty } from "@/lib/api/server"
import { createCredentialError } from "@lucky/core/utils/config/credential-errors"

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
      return alrighty(
        "health/openrouter",
        {
          connected: false,
          message: error.details.userMessage,
          timestamp: new Date().toISOString(),
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
      return alrighty(
        "health/openrouter",
        {
          connected: false,
          message: `OpenRouter API returned ${response.status}: ${response.statusText}`,
          timestamp: new Date().toISOString(),
        },
        { status: response.status },
      )
    }

    const data: OpenRouterResponse = await response.json()

    return alrighty("health/openrouter", {
      connected: true,
      message: `Connected (${data.data.usage}/${data.data.limit || "∞"} credits used)`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return alrighty(
      "health/openrouter",
      {
        connected: false,
        message: error instanceof Error ? error.message : "Failed to check OpenRouter status",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
