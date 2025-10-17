import { alrighty, fail, handleBody, isHandleBodyError } from "@/lib/api/server"
import { auth } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  // Require authentication
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

  // Check if API key is available
  if (!process.env.XAI_API_KEY) {
    return fail("test:post", "XAI_API_KEY environment variable is not set", {
      code: "XAI_KEY_MISSING",
      status: 500,
    })
  }

  const body = await handleBody("test:post", req)
  if (isHandleBodyError(body)) return body

  try {
    // Call X.AI API
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "You are a test assistant.",
          },
          {
            role: "user",
            content: body.message,
          },
        ],
        model: "grok-4-latest",
        stream: false,
        temperature: 0,
      }),
    })

    if (!response.ok) {
      throw new Error(`X.AI API error: ${response.status}`)
    }

    const data = await response.json()

    // Log the response structure for debugging
    console.log("X.AI API Response:", JSON.stringify(data, null, 2))

    const aiMessage = data.choices?.[0]?.message?.content

    if (!aiMessage) {
      console.error("No message content in X.AI response:", data)
      return fail("test:post", "No response content from AI", {
        code: "XAI_NO_CONTENT",
        status: 500,
      })
    }

    return alrighty("test:post", {
      success: true,
      data: {
        message: aiMessage,
        receivedMessage: body.message,
        timestamp: new Date().toISOString(),
      },
      error: null,
    })
  } catch (error) {
    console.error("API Error:", error)
    return fail("test:post", error instanceof Error ? error.message : "Failed to process request", {
      code: "XAI_REQUEST_FAILED",
      status: 500,
    })
  }
}

export async function GET() {
  // Require authentication
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

  try {
    // Check if API key is available
    if (!process.env.XAI_API_KEY) {
      return alrighty("test", {
        message: "Hi and hello world!",
        status: "Test route is working (fallback)",
        timestamp: new Date().toISOString(),
        error: "XAI_API_KEY environment variable is not set",
      })
    }

    // Test call to X.AI API
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROK_API_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "You are a test assistant.",
          },
          {
            role: "user",
            content: "Testing. Just say hi and hello world and nothing else.",
          },
        ],
        model: "grok-4",
        stream: false,
        temperature: 0,
      }),
    })

    if (!response.ok) {
      throw new Error(`X.AI API error: ${response.status}`)
    }

    const data = await response.json()

    // Log the response structure for debugging
    console.log("X.AI API Test Response:", JSON.stringify(data, null, 2))

    const aiMessage = data.choices?.[0]?.message?.content

    return alrighty("test", {
      message: aiMessage || "Hi and hello world!",
      status: "Test route is working",
      timestamp: new Date().toISOString(),
      ...(aiMessage ? {} : { note: "Using fallback message" }),
    })
  } catch (error) {
    console.error("GET API Error:", error)

    const errorMessage = error instanceof Error ? error.message : "X.AI API unavailable"

    return alrighty("test", {
      message: "Hi and hello world!",
      status: "Test route is working (fallback)",
      timestamp: new Date().toISOString(),
      error: errorMessage,
      details: error instanceof Error ? error.stack : String(error),
    })
  }
}
