import { z } from "zod"

/**
 * Single source of truth for environment variable schemas.
 * This module defines all env var schemas, types, and documentation.
 * No process.env access here - just models.
 */

// --- Primitives (reusable validation fragments)
export const apiKey = z.string().min(1)
export const url = z.string().url("Must be a valid URL")
export const httpsUrl = url.refine(u => u.startsWith("https://"), "Must use HTTPS")
export const jwt = z
  .string()
  .min(1, "Key cannot be empty")
  .refine(key => key.startsWith("eyJ"), "Key must be a valid JWT (start with 'eyJ')")

// --- Provider enums
export const Providers = ["openai", "google", "groq", "openrouter"] as const
export type Provider = (typeof Providers)[number]

// --- Supabase (server-side)
export const supabaseServer = z.object({
  SUPABASE_URL: httpsUrl.optional(),
  SUPABASE_PROJECT_ID: z.string().optional(),
  SUPABASE_ANON_KEY: jwt.optional(),
  SUPABASE_SERVICE_ROLE_KEY: jwt.optional(),
})

// --- Supabase (client-side)
export const supabaseClient = z.object({
  NEXT_PUBLIC_SUPABASE_URL: httpsUrl.optional(),
  NEXT_PUBLIC_SUPABASE_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt.optional(),
})

// --- AI Providers
export const aiProviders = z.object({
  OPENAI_API_KEY: apiKey.optional(),
  GOOGLE_API_KEY: apiKey.optional(),
  GROQ_API_KEY: apiKey.optional(),
  OPENROUTER_API_KEY: apiKey.optional(),
  ANTH_API_KEY: apiKey.optional(),
  XAI_API_KEY: apiKey.optional(),
  HF_TOKEN: apiKey.optional(),
  HUGGING_FACE_API_KEY: apiKey.optional(),
})

// --- Search Providers
export const searchProviders = z.object({
  TAVILY_API_KEY: apiKey.optional(),
  SERPAPI_API_KEY: apiKey.optional(),
})

// --- Other Tools
export const toolProviders = z.object({
  FIRECRAWL_API_KEY: apiKey.optional(),
  GOOGLE_API_KEY: apiKey.optional(), // Note: also used for AI, duplicated intentionally
  MAPBOX_TOKEN: apiKey.optional(),
  MEM0_API_KEY: apiKey.optional(),
  WEBSHARE_API_KEY: apiKey.optional(),
})

// --- Lockbox (server-side secrets)
export const lockboxServer = z.object({
  /**
   * 32-byte key for AES-256-GCM encryption of user secrets.
   * Accepts raw text, hex, or base64. For production, use a random 32-byte value.
   * REQUIRED: Lockbox API endpoints will fail with 500 errors if this is not set.
   */
  LOCKBOX_KEK: z.string().min(1, "LOCKBOX_KEK is required for lockbox encryption"),
})

// --- Clerk Auth (server-side)
export const clerkServer = z.object({
  CLERK_SECRET_KEY: apiKey,
  CLERK_WEBHOOK_SECRET: apiKey.optional(),
})

// --- Clerk Auth (client-side)
export const clerkClient = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: apiKey,
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
  NEXT_PUBLIC_CLERK_EXPECTED_ISSUER: httpsUrl.optional(),
})

// --- Core Runtime Toggles
export const coreToggles = z.object({
  REQUIRE_PERSISTENCE: z.enum(["1", "0"]).optional(),
  USE_MOCK_PERSISTENCE: z.enum(["true", "false"]).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
  MCP_SECRET_PATH: z.string().optional(),
  CONFIG_STORAGE_MODE: z.enum(["db", "file"]).optional(),
})

// --- Documentation (for generator & UI)
export type VarDoc = {
  key: string
  required: boolean
  description: string
  example?: string
  section?: string
}

export const docs: VarDoc[] = [
  // Clerk Auth
  {
    key: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    required: true,
    description: "Clerk public key (browser-safe)",
    example: "",
    section: "Auth (Clerk)",
  },
  {
    key: "CLERK_SECRET_KEY",
    required: true,
    description: "Clerk server secret",
    example: "",
    section: "Auth (Clerk)",
  },
  {
    key: "CLERK_WEBHOOK_SECRET",
    required: false,
    description: "Clerk webhook verification secret",
    example: "",
    section: "Auth (Clerk)",
  },
  {
    key: "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
    required: false,
    description: "Sign-in page URL",
    example: "/sign-in",
    section: "Auth (Clerk)",
  },
  {
    key: "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
    required: false,
    description: "Sign-up page URL",
    example: "/sign-up",
    section: "Auth (Clerk)",
  },
  {
    key: "NEXT_PUBLIC_CLERK_EXPECTED_ISSUER",
    required: false,
    description: "Expected Clerk issuer URL for third-party auth",
    example: "https://clerk.goalive.nl",
    section: "Auth (Clerk)",
  },

  // AI Model Providers
  {
    key: "OPENAI_API_KEY",
    required: false,
    description: "OpenAI API key for GPT models",
    example: "sk-...",
    section: "Model providers",
  },
  {
    key: "OPENROUTER_API_KEY",
    required: false,
    description: "OpenRouter API key for multiple model access",
    example: "sk-or-v1-...",
    section: "Model providers",
  },
  {
    key: "GROQ_API_KEY",
    required: false,
    description: "Groq API key for fast inference",
    example: "gsk_...",
    section: "Model providers",
  },
  {
    key: "ANTH_API_KEY",
    required: false,
    description: "Anthropic API key for Claude models",
    example: "sk-ant-...",
    section: "Model providers",
  },
  {
    key: "XAI_API_KEY",
    required: false,
    description: "xAI API key for Grok models",
    example: "xai-...",
    section: "Model providers",
  },
  {
    key: "GOOGLE_API_KEY",
    required: false,
    description: "Google API key (used for Gemini AI and other Google services)",
    example: "",
    section: "Model providers",
  },
  {
    key: "HF_TOKEN",
    required: false,
    description: "Hugging Face token",
    example: "",
    section: "Model providers",
  },
  {
    key: "HUGGING_FACE_API_KEY",
    required: false,
    description: "Hugging Face API key",
    example: "",
    section: "Model providers",
  },

  // Search & Tools
  {
    key: "FIRECRAWL_API_KEY",
    required: false,
    description: "Firecrawl API key for web scraping",
    example: "fc-...",
    section: "Tools / data",
  },
  {
    key: "SERPAPI_API_KEY",
    required: false,
    description: "SerpAPI key for search functionality",
    example: "",
    section: "Tools / data",
  },
  {
    key: "MAPBOX_TOKEN",
    required: false,
    description: "Mapbox token for mapping features",
    example: "pk.ey...",
    section: "Tools / data",
  },
  {
    key: "TAVILY_API_KEY",
    required: false,
    description: "Tavily API key for advanced search",
    example: "tvly-...",
    section: "Tools / data",
  },
  {
    key: "WEBSHARE_API_KEY",
    required: false,
    description: "Webshare proxy API key",
    example: "",
    section: "Tools / data",
  },
  // Lockbox
  {
    key: "LOCKBOX_KEK",
    required: true,
    description: "32-byte key (raw/hex/base64) used to encrypt user secrets with AES-256-GCM. Set on server only.",
    example: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    section: "Security / secrets",
  },
  {
    key: "MEM0_API_KEY",
    required: false,
    description: "Mem0 API key for enhanced memory",
    example: "",
    section: "Tools / data",
  },

  // Supabase - Server
  {
    key: "SUPABASE_URL",
    required: false,
    description: "Supabase project URL (server-side, or use SUPABASE_PROJECT_ID)",
    example: "https://yourproject.supabase.co",
    section: "Supabase - Database configuration",
  },
  {
    key: "SUPABASE_PROJECT_ID",
    required: false,
    description: "Supabase project ID (alternative to full URL)",
    example: "yourproject",
    section: "Supabase - Database configuration",
  },
  {
    key: "SUPABASE_ANON_KEY",
    required: false,
    description: "Supabase anonymous key (server-side)",
    example: "eyJhbGc...",
    section: "Supabase - Database configuration",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    required: false,
    description: "Supabase service role key for admin operations (server-only)",
    example: "eyJhbGc...",
    section: "Supabase - Database configuration",
  },

  // Supabase - Client
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    required: false,
    description: "Supabase project URL (browser-safe, or use NEXT_PUBLIC_SUPABASE_PROJECT_ID)",
    example: "https://yourproject.supabase.co",
    section: "Supabase - Database configuration",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_PROJECT_ID",
    required: false,
    description: "Supabase project ID (browser-safe, alternative to full URL)",
    example: "yourproject",
    section: "Supabase - Database configuration",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    required: false,
    description: "Supabase anonymous key (browser-safe, must match SUPABASE_ANON_KEY)",
    example: "eyJhbGc...",
    section: "Supabase - Database configuration",
  },

  // Runtime Toggles
  {
    key: "REQUIRE_PERSISTENCE",
    required: false,
    description: "Set to '1' to enforce Supabase persistence (fail if not configured)",
    example: "",
    section: "Optional runtime configuration",
  },
  {
    key: "USE_MOCK_PERSISTENCE",
    required: false,
    description: "Set to 'true' to use in-memory storage instead of Supabase",
    example: "false",
    section: "Optional runtime configuration",
  },
  {
    key: "NODE_ENV",
    required: false,
    description: "Node environment (development, test, production)",
    example: "development",
    section: "Optional runtime configuration",
  },
  {
    key: "MCP_SECRET_PATH",
    required: false,
    description: "Path to MCP secrets file",
    example: "",
    section: "Optional runtime configuration",
  },
  {
    key: "CONFIG_STORAGE_MODE",
    required: false,
    description: "Configuration storage mode (db or file)",
    example: "",
    section: "Optional runtime configuration",
  },
]

// --- Type exports
export type SupabaseServerEnv = z.infer<typeof supabaseServer>
export type SupabaseClientEnv = z.infer<typeof supabaseClient>
export type AIProvidersEnv = z.infer<typeof aiProviders>
export type SearchProvidersEnv = z.infer<typeof searchProviders>
export type ToolProvidersEnv = z.infer<typeof toolProviders>
export type ClerkServerEnv = z.infer<typeof clerkServer>
export type ClerkClientEnv = z.infer<typeof clerkClient>
export type CoreTogglesEnv = z.infer<typeof coreToggles>
