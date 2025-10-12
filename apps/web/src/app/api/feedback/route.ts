import { createRLSClient } from "@/lib/supabase/server-rls"
import { auth } from "@clerk/nextjs/server"
import { feedbackSubmissionSchema } from "@lucky/shared/contracts/feedback"
import { NextResponse } from "next/server"
import { ZodError } from "zod"

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

    // Validate with Zod schema
    const validation = feedbackSubmissionSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid feedback submission",
          details: validation.error.errors,
        },
        { status: 400 },
      )
    }

    const { content, context } = validation.data

    const supabase = await createRLSClient()
    const { error } = await supabase
      .schema("app")
      .from("feedback")
      .insert({
        clerk_id: userId || null,
        content: content.trim(),
        context: context,
        status: "new",
      })

    if (error) {
      console.error("Failed to submit feedback:", error)
      return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid feedback data", details: error.errors }, { status: 400 })
    }
    console.error("Feedback POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
