import { createOrUpdateEnvKey, deleteEnvKey, listEnvKeys } from "@/features/secret-management/lib/env-keys"
import { alrighty, fail, handleBody, isHandleBodyError } from "@/lib/api/server"
import { logException } from "@/lib/error-logger"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { auth } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

// GET /api/user/env-keys
// Returns list of all environment variable names and metadata (not values)
export async function GET(_req: NextRequest) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

  const supabase = await createRLSClient()

  try {
    const { data, error } = await listEnvKeys(supabase, userId)

    if (error) {
      console.error("[GET /api/user/env-keys] Supabase error:", error)
      return fail("user/env-keys", `Failed to fetch environment keys: ${error.message}`, {
        code: "DATABASE_ERROR",
        status: 500,
      })
    }

    const keys = data.map(row => ({
      id: row.user_secret_id,
      name: row.name,
      createdAt: row.created_at,
    }))

    return alrighty("user/env-keys", {
      success: true,
      data: keys,
      error: null,
    })
  } catch (e: any) {
    logException(e, {
      location: "/api/user/env-keys/GET",
    })
    return fail("user/env-keys", e?.message ?? "Failed to fetch environment keys", {
      code: "INTERNAL_ERROR",
      status: 500,
    })
  }
}

// POST /api/user/env-keys
// Body: { key: string, value: string }
// Creates or updates an environment variable
export async function POST(req: NextRequest) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

  const supabase = await createRLSClient()

  const body = await handleBody("user/env-keys/set", req)
  if (isHandleBodyError(body)) return body

  const { key: name, value } = body

  try {
    console.log("[POST /api/user/env-keys] Saving environment key:")
    console.log("  clerk_id:", userId)
    console.log("  name:", name)

    await createOrUpdateEnvKey(supabase, userId, name, value)

    console.log("[POST /api/user/env-keys] Successfully saved environment key:", name)

    return alrighty("user/env-keys/set", {
      success: true,
      data: { updated: true },
      error: null,
    })
  } catch (e: any) {
    console.error("[POST /api/user/env-keys] Error saving environment key:", e)
    logException(e, {
      location: "/api/user/env-keys/POST",
    })
    return fail("user/env-keys/set", e?.message ?? "Failed to save environment key", {
      code: "INTERNAL_ERROR",
      status: 500,
    })
  }
}

// DELETE /api/user/env-keys?name=VARIABLE_NAME
// Soft-deletes an environment variable
export async function DELETE(req: NextRequest) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

  const supabase = await createRLSClient()
  const name = req.nextUrl.searchParams.get("name")

  if (!name) {
    return fail("user/env-keys/[name]", "Missing required parameter: name", {
      code: "MISSING_PARAMETER",
      status: 400,
    })
  }

  try {
    await deleteEnvKey(supabase, userId, name)

    return alrighty("user/env-keys", {
      success: true,
      data: [],
      error: null,
    })
  } catch (e: any) {
    logException(e, {
      location: "/api/user/env-keys/DELETE",
    })
    return fail("user/env-keys/[name]", e?.message ?? "Failed to delete environment key", {
      code: "INTERNAL_ERROR",
      status: 500,
    })
  }
}
