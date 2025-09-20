import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const envi = createEnv({
  server: {
    CLERK_SECRET_KEY: z.string(),
    TAVILY_API_KEY: z.string().nullish(),
    WEBSHARE_API_KEY: z.string().nullish(),
    MAPBOX_TOKEN: z.string().nullish(),
    OPENROUTER_API_KEY: z.string().nullish(),
    GROQ_API_KEY: z.string().nullish(),
    GOOGLE_API_KEY: z.string(),
    OPENAI_API_KEY: z.string(),
    SERPAPI_API_KEY: z.string(),
    // Standard Supabase env vars (optional to support non-Supabase environments)
    SUPABASE_URL: z.string().nullish(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().nullish(),
    // Fallback vars for backwards compatibility
    SUPABASE_PROJECT_ID: z.string().nullish(),
    SUPABASE_ANON_KEY: z.string().nullish(),
  },
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
    // Make Clerk URLs configurable but safe-defaulted
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default("/"),
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default("/"),
    // Standard Supabase env vars (optional to support non-Supabase environments)
    NEXT_PUBLIC_SUPABASE_URL: z.string().nullish(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().nullish(),
    // Fallback vars for backwards compatibility
    NEXT_PUBLIC_SUPABASE_PROJECT_ID: z.string().nullish(),
  },
  runtimeEnv: {
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL:
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL:
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    // Standard Supabase env vars
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    // Fallback vars for backwards compatibility
    SUPABASE_PROJECT_ID: process.env.SUPABASE_PROJECT_ID,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PROJECT_ID:
      process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID,
    WEBSHARE_API_KEY: process.env.WEBSHARE_API_KEY,
    MAPBOX_TOKEN: process.env.MAPBOX_TOKEN,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    SERPAPI_API_KEY: process.env.SERPAPI_API_KEY,
  },
})
