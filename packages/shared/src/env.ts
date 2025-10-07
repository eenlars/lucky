/**
 * @deprecated Import from @lucky/shared/env-models instead.
 * This file is kept for backward compatibility only.
 */

// Re-export from env-models for backward compatibility
export {
  supabaseServer as serverSupabaseEnvSchema,
  supabaseClient as clientSupabaseEnvSchema,
  type SupabaseServerEnv as ServerSupabaseEnv,
  type SupabaseClientEnv as ClientSupabaseEnv,
} from "./env-models"
