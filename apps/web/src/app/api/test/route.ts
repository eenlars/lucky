import { requireAuth } from "@/lib/api-auth"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    // Check if API key is available
    if (!process.env.XAI_API_KEY) {
      return NextResponse.json({ error: "XAI_API_KEY environment variable is not set" }, { status: 500 })
    }

    const body = await request.json()
    const { message } = body

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

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
            content: message,
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
      return NextResponse.json({ error: "No response content from AI" }, { status: 500 })
    }

    return NextResponse.json({
      message: aiMessage,
      receivedMessage: message,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("API Error:", error)

    // Provide more specific error information
    let errorMessage = "Failed to process request"
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

export async function GET() {
  try {
    // Require authentication
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    // Check if API key is available
    if (!process.env.XAI_API_KEY) {
      return NextResponse.json({
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

    return NextResponse.json({
      message: aiMessage || "Hi and hello world!",
      status: "Test route is working",
      timestamp: new Date().toISOString(),
      ...(aiMessage ? {} : { note: "Using fallback message" }),
    })
  } catch (error) {
    console.error("GET API Error:", error)

    let errorMessage = "X.AI API unavailable"
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return NextResponse.json({
      message: "Hi and hello world!",
      status: "Test route is working (fallback)",
      timestamp: new Date().toISOString(),
      error: errorMessage,
      details: error instanceof Error ? error.stack : String(error),
    })
  }
}
