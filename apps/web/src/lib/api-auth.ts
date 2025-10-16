import { type Principal, authenticateRequest } from "@/lib/auth/principal"
import { auth } from "@clerk/nextjs/server"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

/**
 * Legacy authentication helper - returns Clerk userId (session-only)
 * Use authenticateRequest() for API key + session support
 */
export async function requireAuth() {
  const { isAuthenticated, userId } = await auth()

  if (!isAuthenticated) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  return userId
}

/**
 * Modern authentication helper - supports both API keys and sessions
 * Returns Principal with clerk_id, scopes, and auth_method
 */
export async function requireAuthWithApiKey(req: NextRequest): Promise<Principal | NextResponse> {
  const principal = await authenticateRequest(req)

  if (!principal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return principal
}
