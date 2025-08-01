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
      return NextResponse.json(
        { error: "OpenRouter API key not configured" },
        { status: 500 }
      )
    }

    const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch OpenRouter status" },
        { status: response.status }
      )
    }

    const data: OpenRouterResponse = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
