import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const envi = createEnv({
  server: {
    TAVILY_API_KEY: z.string().nullish(),
    ANTHROPIC_API_KEY: z.string().nullish(),
    WEBSHARE_API_KEY: z.string().nullish(),
    MAPBOX_TOKEN: z.string().nullish(),
    OPENROUTER_API_KEY: z.string().nullish(),
    GROQ_API_KEY: z.string().nullish(),
    GOOGLE_API_KEY: z.string(),
    OPENAI_API_KEY: z.string(),
    SERPAPI_API_KEY: z.string(),
    // Core runtime-only (server-side) variables
    HF_TOKEN: z.string().nullish(),
    HUGGING_FACE_API_KEY: z.string().nullish(),
    MEM0_API_KEY: z.string().nullish(),
    SUPABASE_PROJECT_ID: z.string().nullish(),
    SUPABASE_ANON_KEY: z.string().nullish(),
    MCP_SECRET_PATH: z.string().nullish(),
    CONFIG_STORAGE_MODE: z.enum(["db", "file"]).nullish(),
    NODE_ENV: z.enum(["development", "test", "production"]).nullish(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_PROJECT_ID: z.string().nullish(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().nullish(),
  },
  runtimeEnv: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    NEXT_PUBLIC_SUPABASE_PROJECT_ID:
      process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    WEBSHARE_API_KEY: process.env.WEBSHARE_API_KEY,
    MAPBOX_TOKEN: process.env.MAPBOX_TOKEN,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    SERPAPI_API_KEY: process.env.SERPAPI_API_KEY,
    // Server-only runtime env passthroughs
    HF_TOKEN: process.env.HF_TOKEN,
    HUGGING_FACE_API_KEY: process.env.HUGGING_FACE_API_KEY,
    MEM0_API_KEY: process.env.MEM0_API_KEY,
    SUPABASE_PROJECT_ID: process.env.SUPABASE_PROJECT_ID,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    MCP_SECRET_PATH: process.env.MCP_SECRET_PATH,
    CONFIG_STORAGE_MODE: process.env.CONFIG_STORAGE_MODE,
    NODE_ENV: process.env.NODE_ENV,
  },
})
