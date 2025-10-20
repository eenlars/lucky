import {
  aiProviders,
  clerkClient,
  clerkServer,
  redisConfig,
  searchProviders,
  supabaseClient,
  supabaseServer,
  toolProviders,
} from "@lucky/shared/env-models"
import { createEnv } from "@t3-oss/env-nextjs"

/**
 * Web app environment validation (server + client).
 * Uses shared schemas from @lucky/shared/env-models as the single source of truth.
 *
 * Import from this module instead of using process.env directly.
 */
export const envi = createEnv({
  server: {
    ...clerkServer.shape,
    ...supabaseServer.shape,
    ...aiProviders.shape,
    ...searchProviders.shape,
    ...toolProviders.shape,
    ...redisConfig.shape,
  },
  client: {
    ...clerkClient.shape,
    ...supabaseClient.shape,
  },
  runtimeEnv: {
    // Clerk server
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
    // Clerk client
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
    NEXT_PUBLIC_CLERK_EXPECTED_ISSUER: process.env.NEXT_PUBLIC_CLERK_EXPECTED_ISSUER,
    // Supabase server
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    // Supabase client
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    // AI providers
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    ANTH_API_KEY: process.env.ANTH_API_KEY,
    XAI_API_KEY: process.env.XAI_API_KEY,
    HF_TOKEN: process.env.HF_TOKEN,
    HUGGING_FACE_API_KEY: process.env.HUGGING_FACE_API_KEY,
    // Search providers
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    SERPAPI_API_KEY: process.env.SERPAPI_API_KEY,
    // Tool providers
    FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
    MAPBOX_TOKEN: process.env.MAPBOX_TOKEN,
    MEM0_API_KEY: process.env.MEM0_API_KEY,
    WEBSHARE_API_KEY: process.env.WEBSHARE_API_KEY,
    // Redis
    REDIS_ENABLED: process.env.REDIS_ENABLED,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  },
})

/**
 * Assert that server and client Supabase configs match (if both are set).
 * Call this at app startup to catch configuration drift.
 */
export function assertSupabaseMirrors() {
  const serverUrl = process.env.SUPABASE_URL
  const clientUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (serverUrl && clientUrl && serverUrl !== clientUrl) {
    throw new Error(
      `Configuration error: SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL must match. Got server="${serverUrl}" vs client="${clientUrl}"`,
    )
  }

  const serverKey = process.env.SUPABASE_ANON_KEY
  const clientKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (serverKey && clientKey && serverKey !== clientKey) {
    throw new Error(
      "Configuration error: SUPABASE_ANON_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY must match. " +
        "Check your .env file for inconsistencies.",
    )
  }
}
