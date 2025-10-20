import { alrighty, fail, handleBody, isHandleBodyError } from "@/lib/api/server"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { ZodError } from "zod"

export async function POST(req: Request) {
  try {
    const { isAuthenticated, userId } = await auth()

    // Validate request body using type-safe schema
    const body = await handleBody("feedback", req as any)
    if (isHandleBodyError(body)) return body

    const { message: content, context, type } = body

    const supabase = await createRLSClient()
    const { error } = await supabase
      .schema("app")
      .from("feedback")
      .insert({
        clerk_id: userId || null,
        content: content.trim(),
        context: context as any, // Type assertion for JSON field
        status: "new",
      })

    if (error) {
      console.error("Failed to submit feedback:", error)
      return fail("feedback", "Failed to submit feedback", {
        code: "DATABASE_ERROR",
        status: 500,
      })
    }

    return alrighty("feedback", {
      success: true,
      data: {
        submitted: true,
        feedbackId: undefined, // Could return ID if we selected it
      },
      error: null,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("feedback", "Invalid feedback data", {
        code: "VALIDATION_ERROR",
        status: 400,
      })
    }
    console.error("Feedback POST error:", error)
    return fail("feedback", "Internal server error", {
      code: "INTERNAL_ERROR",
      status: 500,
    })
  }
}
