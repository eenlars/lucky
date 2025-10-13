import { personalProfileSchema } from "@/features/profile/schemas/profile.schema"
import { logException } from "@/lib/error-logger"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { auth } from "@clerk/nextjs/server"
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
      .schema("app")
      .from("user_profile")
      .select("about, goals")
      .eq("clerk_id", userId)
      .maybeSingle()

    if (error) {
      console.error("Failed to fetch user profile:", error)
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
    }

    // If no profile exists yet, return empty profile
    if (!data) {
      return NextResponse.json({ profile: {} })
    }

    // Validate with Zod
    const validatedProfile = personalProfileSchema.parse(data)

    return NextResponse.json({ profile: validatedProfile })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid profile data", details: error.errors }, { status: 400 })
    }
    logException(error, {
      location: "/api/user/profile/GET",
    })
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
      .schema("app")
      .from("user_profile")
      .upsert(
        {
          clerk_id: userId,
          about: validatedProfile.about ?? null,
          goals: validatedProfile.goals ?? null,
        },
        {
          onConflict: "clerk_id",
        },
      )

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
    logException(error, {
      location: "/api/user/profile/PUT",
    })
    console.error("Profile PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
