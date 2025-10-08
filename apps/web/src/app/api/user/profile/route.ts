import { createRLSClient } from "@/lib/supabase/server-rls"
import { personalProfileSchema } from "@/schemas/profile.schema"
import { auth } from "@clerk/nextjs/server"
import type { Database } from "@lucky/shared/client"
import { NextResponse } from "next/server"
import { ZodError } from "zod"

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createRLSClient()
    const { data, error } = await supabase
      .schema("iam")
      .from("users")
      .select("metadata")
      .eq("clerk_id", userId)
      .single()

    if (error) {
      // Handle case where user doesn't exist yet
      if (error.code === "PGRST116") {
        return NextResponse.json({ profile: {} })
      }
      console.error("Failed to fetch user profile:", error)
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
    }

    // Ensure metadata is a valid object and validate with Zod
    const rawProfile = typeof data?.metadata === "object" && data.metadata !== null ? data.metadata : {}
    const validatedProfile = personalProfileSchema.parse(rawProfile)

    return NextResponse.json({ profile: validatedProfile })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid profile data", details: error.errors }, { status: 400 })
    }
    console.error("Profile GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse and validate request body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    if (!body || typeof body !== "object" || !("profile" in body)) {
      return NextResponse.json({ error: "Missing 'profile' field" }, { status: 400 })
    }

    const { profile } = body as { profile: unknown }

    // Validate and sanitize profile data using Zod (transforms will trim strings)
    const validatedProfile = personalProfileSchema.parse(profile)

    const supabase = await createRLSClient()
    const { error } = await supabase
      .schema("iam")
      .from("users")
      .update({
        metadata: validatedProfile as Database["iam"]["Tables"]["users"]["Update"]["metadata"],
        updated_at: new Date().toISOString(),
      } satisfies Database["iam"]["Tables"]["users"]["Update"])
      .eq("clerk_id", userId)

    if (error) {
      console.error("Failed to update user profile:", error)
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
    }

    return NextResponse.json({ success: true, profile: validatedProfile })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid profile data",
          details: error.errors.map(e => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      )
    }
    console.error("Profile PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
