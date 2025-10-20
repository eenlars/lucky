import { createSecretResolver } from "@/features/secret-management/lib/secretResolver"
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * Debug endpoint to check what API keys are stored for the current user
 * GET /api/debug/check-keys
 */
export async function GET() {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const secrets = createSecretResolver(userId)

    // Try to fetch all common provider keys
    const keysToCheck = ["OPENAI_API_KEY", "GROQ_API_KEY", "OPENROUTER_API_KEY"]
    const apiKeys = await secrets.getAll(keysToCheck, "environment-variables")

    const result: Record<string, { exists: boolean; length?: number }> = {}

    for (const keyName of keysToCheck) {
      const value = apiKeys[keyName]
      result[keyName] = {
        exists: !!value,
        length: value?.length,
      }
    }

    return NextResponse.json({
      clerk_id: userId,
      keys: result,
      debug: {
        totalKeysFound: Object.values(apiKeys).filter(v => v).length,
        keysChecked: keysToCheck,
      },
    })
  } catch (error) {
    console.error("[debug/check-keys] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
