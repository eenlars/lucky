import { personalProfileSchema } from "@/features/profile/schemas/profile.schema"
import { alrighty, handleBody, isHandleBodyError } from "@/lib/api/server"
import { logException } from "@/lib/error-logger"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { auth } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

export async function GET() {
  try {
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

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
      return alrighty("user/profile", { profile: {} })
    }

    // Validate with Zod
    const validatedProfile = personalProfileSchema.parse(data)

    return alrighty("user/profile", { profile: validatedProfile })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid profile data" }, { status: 400 })
    }
    logException(error, {
      location: "/api/user/profile/GET",
    })
    console.error("Profile GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const body = await handleBody("user/profile:put", req)
  if (isHandleBodyError(body)) return body

  try {
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

    // Validate and sanitize profile data using Zod (transforms will trim strings)
    const validatedProfile = personalProfileSchema.parse(body.profile)

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

    return alrighty("user/profile:put", { success: true, profile: validatedProfile })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid profile data" }, { status: 400 })
    }
    logException(error, {
      location: "/api/user/profile/PUT",
    })
    console.error("Profile PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
