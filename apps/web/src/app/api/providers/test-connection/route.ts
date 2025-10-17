import { alrighty, fail, handleBody, isHandleBodyError } from "@/lib/api/server"
import { logException } from "@/lib/error-logger"
import type { LuckyProvider } from "@lucky/shared"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await handleBody("providers/test-connection", request as any)
    if (isHandleBodyError(body)) return body

    const { provider, apiKey } = body

    // Test connection based on provider
    let testResult: { success: boolean; error?: string; modelCount?: number }

    switch (provider) {
      case "openai":
        testResult = await testOpenAIConnection(apiKey)
        break
      case "groq":
        testResult = await testGroqConnection(apiKey)
        break
      case "openrouter":
        testResult = await testOpenRouterConnection(apiKey)
        break
      default:
        return fail("providers/test-connection", `Unsupported provider: ${provider}`, {
          code: "UNSUPPORTED_PROVIDER",
          status: 400,
        })
    }

    if (!testResult.success) {
      return fail("providers/test-connection", testResult.error || "Connection test failed", {
        code: "CONNECTION_FAILED",
        status: 401,
      })
    }

    return alrighty("providers/test-connection", {
      success: true,
      data: {
        connected: true,
        message: `Connected successfully (${testResult.modelCount} models available)`,
      },
      error: null,
    })
  } catch (error) {
    logException(error, {
      location: "/api/providers/test-connection",
    })
    console.error("Error testing provider connection:", error)
    return fail("providers/test-connection", "Internal server error", {
      code: "INTERNAL_ERROR",
      status: 500,
    })
  }
}

async function testOpenAIConnection(
  apiKey: string,
): Promise<{ success: boolean; error?: string; modelCount?: number }> {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: error.error?.message || "Invalid API key or authentication failed",
      }
    }

    const data = await response.json()
    return {
      success: true,
      modelCount: data.data?.length || 0,
    }
  } catch (_error) {
    return {
      success: false,
      error: "Failed to connect to OpenAI API",
    }
  }
}

async function testGroqConnection(apiKey: string): Promise<{ success: boolean; error?: string; modelCount?: number }> {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: error.error?.message || "Invalid API key or authentication failed",
      }
    }

    const data = await response.json()
    return {
      success: true,
      modelCount: data.data?.length || 0,
    }
  } catch (_error) {
    return {
      success: false,
      error: "Failed to connect to Groq API",
    }
  }
}

async function testOpenRouterConnection(
  apiKey: string,
): Promise<{ success: boolean; error?: string; modelCount?: number }> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: error.error?.message || "Invalid API key or authentication failed",
      }
    }

    const data = await response.json()
    return {
      success: true,
      modelCount: data.data?.length || 0,
    }
  } catch (_error) {
    return {
      success: false,
      error: "Failed to connect to OpenRouter API",
    }
  }
}
