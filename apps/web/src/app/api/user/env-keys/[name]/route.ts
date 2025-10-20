import { decryptEnvKey, getEnvKeyByName, updateEnvKeyLastUsed } from "@/features/secret-management/lib/env-keys"
import { alrighty, fail } from "@/lib/api/server"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { auth } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

// GET /api/user/env-keys/[name]
// Returns the decrypted value of a specific environment variable
export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

  const { name } = await params

  if (!name) {
    return fail("user/env-keys/[name]", "Missing name parameter", {
      code: "MISSING_NAME",
      status: 400,
    })
  }

  const supabase = await createRLSClient()

  try {
    const { data, error } = await getEnvKeyByName(supabase, userId, name)

    if (error) {
      console.error("[GET /api/user/env-keys/[name]] Supabase error:", error)
      return fail("user/env-keys/[name]", `Failed to fetch environment key: ${error.message}`, {
        code: "SUPABASE_ERROR",
        status: 500,
      })
    }

    if (!data) {
      return fail("user/env-keys/[name]", "Environment variable not found", {
        code: "NOT_FOUND",
        status: 404,
      })
    }

    // Decrypt the value
    const value = decryptEnvKey(data.ciphertext, data.iv, data.auth_tag)

    // Update last_used_at
    await updateEnvKeyLastUsed(supabase, data.user_secret_id)

    return alrighty("user/env-keys/[name]", {
      success: true,
      data: {
        id: data.user_secret_id,
        name: data.name,
        value,
        createdAt: data.created_at,
      },
    })
  } catch (e: any) {
    return fail("user/env-keys/[name]", e?.message ?? "Failed to fetch environment key", {
      code: "DECRYPT_ERROR",
      status: 500,
    })
  }
}
