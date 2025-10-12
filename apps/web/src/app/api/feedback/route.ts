import { createRLSClient } from "@/lib/supabase/server-rls"
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    // Parse request body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    if (!body || typeof body !== "object" || !("content" in body)) {
      return NextResponse.json({ error: "Missing 'content' field" }, { status: 400 })
    }

    const { content, context } = body as { content: string; context?: string }

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Content cannot be empty" }, { status: 400 })
    }

    const supabase = await createRLSClient()
    const { error } = await supabase
      .schema("app")
      .from("feedback")
      .insert({
        clerk_id: userId || null,
        content: content.trim(),
        context: context || null,
        status: "new",
      })

    if (error) {
      console.error("Failed to submit feedback:", error)
      return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Feedback POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
