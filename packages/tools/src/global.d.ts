/**
 * Global type declarations for dependencies from @core
 */

declare module "@core/utils/env.mjs" {
  export interface Envi {
    TAVILY_API_KEY?: string | null
    WEBSHARE_API_KEY?: string | null
    MAPBOX_TOKEN?: string | null
    OPENROUTER_API_KEY?: string | null
    GROQ_API_KEY?: string | null
    GOOGLE_API_KEY: string
    OPENAI_API_KEY: string
    SERPAPI_API_KEY: string
    HF_TOKEN?: string | null
    HUGGING_FACE_API_KEY?: string | null
    MEM0_API_KEY?: string | null
    SUPABASE_PROJECT_ID?: string | null
    SUPABASE_ANON_KEY?: string | null
    MCP_SECRET_PATH?: string | null
    CONFIG_STORAGE_MODE?: "db" | "file" | null
    NODE_ENV?: "development" | "test" | "production" | null
    NEXT_PUBLIC_SUPABASE_PROJECT_ID?: string | null
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string | null
  }

  export const envi: Envi
}
