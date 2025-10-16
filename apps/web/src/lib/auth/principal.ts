import { createClient } from "@/lib/supabase/server"
import { auth } from "@clerk/nextjs/server"
import crypto from "node:crypto"

export type Principal = {
  clerk_id: string
  scopes: string[]
  auth_method: "api_key" | "session"
}

export async function authenticateRequest(req: Request): Promise<Principal | null> {
  const authHeader = req.headers.get("authorization")
  console.log("[AUTH] Authorization header:", authHeader ? `Bearer ${authHeader.slice(7, 20)}...` : "missing")

  // Path 1: API Key authentication
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7)
    console.log("[AUTH] Token prefix:", token.slice(0, 10))

    // Extract secret from token (remove "alive_" prefix)
    const secret = token.startsWith("alive_") ? token.slice(6) : token
    const secretHash = crypto.createHash("sha256").update(secret).digest("hex")
    console.log("[AUTH] Secret hash:", `${secretHash.slice(0, 16)}...`)

    // Validate token via SECURITY DEFINER RPC (uses anon; no direct table access)
    const supabase = await createClient() // defaults to anon (RLS enforced)
    const { data: row, error } = await supabase
      .schema("lockbox")
      .rpc("validate_bearer_token", { p_secret_hash: secretHash })
      .maybeSingle()

    console.log("[AUTH] RPC result:", {
      hasData: !!row,
      error: error?.message,
    })

    if (error || !row) {
      console.log("[AUTH] Authentication failed:", error?.message || "No matching token found")
      return null
    }

    console.log("[AUTH] ✅ Authentication successful:", {
      clerk_id: row.clerk_id,
      method: "api_key",
    })

    return {
      clerk_id: row.clerk_id as string,
      scopes: (row.scopes as any)?.all ? ["*"] : [],
      auth_method: "api_key",
    }
  }

  // Path 2: Clerk session authentication
  const { userId } = await auth()
  if (!userId) {
    console.log("[AUTH] No valid authentication found (no bearer token or session)")
    return null
  }

  console.log("[AUTH] ✅ Authentication successful:", {
    clerk_id: userId,
    method: "session",
  })

  return {
    clerk_id: userId,
    scopes: ["*"],
    auth_method: "session",
  }
}
