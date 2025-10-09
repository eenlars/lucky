import crypto from "node:crypto"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { auth } from "@clerk/nextjs/server"

export type Principal = {
  clerk_id: string
  scopes: string[]
  auth_method: "api_key" | "session"
}

export async function authenticateRequest(req: Request): Promise<Principal | null> {
  const authHeader = req.headers.get("authorization")

  // Path 1: API Key authentication
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7)

    // Extract secret from token (remove "alive_" prefix)
    const secret = token.startsWith("alive_") ? token.slice(6) : token
    const secretHash = crypto.createHash("sha256").update(secret).digest("hex")

    const supabase = await createRLSClient()
    const { data, error } = await supabase
      .schema("lockbox")
      .from("secret_keys")
      .select("clerk_id, scopes, secret_id")
      .eq("secret_hash", secretHash)
      .is("revoked_at", null)
      .maybeSingle()

    if (error || !data) {
      return null
    }

    // Update last_used_at
    await supabase
      .schema("lockbox")
      .from("secret_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("secret_id", data.secret_id)

    return {
      clerk_id: data.clerk_id,
      scopes: (data.scopes as any)?.all ? ["*"] : [],
      auth_method: "api_key",
    }
  }

  // Path 2: Clerk session authentication
  const { userId } = await auth()
  if (!userId) {
    return null
  }

  return {
    clerk_id: userId,
    scopes: ["*"],
    auth_method: "session",
  }
}
