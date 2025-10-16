import type { Principal } from "@/lib/auth/principal"
import { createClient } from "@/lib/supabase/server"
import { createRLSClient } from "@/lib/supabase/server-rls"

/**
 * Creates a Supabase client based on authentication context.
 *
 * - API key auth: Uses service role (bearer token already validated, safe to bypass RLS)
 * - Session auth: Uses RLS client (Clerk JWT provides user context)
 */
export async function createContextAwareClient(principal: Principal) {
	if (principal.auth_method === "api_key") {
		console.log("[context-client] Using service role for API key auth")
		return await createClient({ keyType: "service" })
	}

	console.log("[context-client] Using RLS client for session auth")
	return await createRLSClient()
}
