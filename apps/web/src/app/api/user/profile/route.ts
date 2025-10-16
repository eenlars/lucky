import { personalProfileSchema } from "@/features/profile/schemas/profile.schema"
import { alrighty, fail, handleBody, isHandleBodyError } from "@/lib/api/server"
import { logException } from "@/lib/error-logger"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { auth } from "@clerk/nextjs/server"
import { type NextRequest } from "next/server"
import { ZodError } from "zod"

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return fail("user/profile", "Unauthorized", { code: "UNAUTHORIZED", status: 401 })
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
      return fail("user/profile", "Failed to fetch profile", { code: "SUPABASE_ERROR", status: 500 })
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
      return fail("user/profile", "Invalid profile data", {
        code: "VALIDATION_ERROR",
        status: 400,
      })
    }
    logException(error, {
      location: "/api/user/profile/GET",
    })
    console.error("Profile GET error:", error)
    return fail("user/profile", "Internal server error", { code: "INTERNAL_ERROR", status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const body = await handleBody("user/profile:put", req)
  if (isHandleBodyError(body)) return body

  try {
    const { userId } = await auth()
    if (!userId) {
      return fail("user/profile:put", "Unauthorized", { code: "UNAUTHORIZED", status: 401 })
    }

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
      return fail("user/profile:put", "Failed to update profile", {
        code: "SUPABASE_ERROR",
        status: 500,
      })
    }

    return alrighty("user/profile:put", { success: true, profile: validatedProfile })
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("user/profile:put", "Invalid profile data", {
        code: "VALIDATION_ERROR",
        status: 400,
      })
    }
    logException(error, {
      location: "/api/user/profile/PUT",
    })
    console.error("Profile PUT error:", error)
    return fail("user/profile:put", "Internal server error", { code: "INTERNAL_ERROR", status: 500 })
  }
}
