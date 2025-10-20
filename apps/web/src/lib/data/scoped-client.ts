import type { Principal } from "@/lib/auth/principal"
import { createContextAwareClient } from "@/lib/supabase/context-aware-client"
import { createClient } from "@/lib/supabase/server"
import { createRLSClient } from "@/lib/supabase/server-rls"
import type { Database } from "@lucky/shared/client"
import type { SupabaseClient } from "@supabase/supabase-js"

export type ScopedClientMode = "service" | "rls"

export interface ScopedSupabaseClient {
  client: SupabaseClient<Database>
  mode: ScopedClientMode
}

export async function createScopedClient(principal?: Principal): Promise<ScopedSupabaseClient> {
  if (principal?.auth_method === "api_key") {
    const client = await createClient({ keyType: "service" })
    return { client, mode: "service" }
  }

  const client = principal ? await createContextAwareClient(principal) : await createRLSClient()
  return { client, mode: "rls" }
}
