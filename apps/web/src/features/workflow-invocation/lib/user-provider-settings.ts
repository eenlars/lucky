import type { Principal } from "@/lib/auth/principal"
import { createContextAwareClient } from "@/lib/supabase/context-aware-client"

/**
 * User's provider settings from database
 */
export type UserProviderSettings = {
  provider: string
  enabled_models: string[]
  is_enabled: boolean
}

/**
 * Fetch user's provider settings from the database.
 *
 * Retrieves all provider configurations for a user, including:
 * - Which providers are enabled
 * - Which models are enabled per provider
 *
 * @param clerkId - User's Clerk ID
 * @param principal - Authentication principal (determines RLS vs service role)
 * @returns Map of provider name to enabled models
 *
 * @example
 * const settings = await fetchUserProviderSettings("user_123", principal)
 * // Returns: Map { "openai" => ["gpt-4o", "gpt-4o-mini"], "groq" => ["llama-3.1-8b"] }
 */
export async function fetchUserProviderSettings(clerkId: string, principal: Principal): Promise<Map<string, string[]>> {
  try {
    const supabase = await createContextAwareClient(principal)

    const { data, error } = await supabase
      .schema("app")
      .from("provider_settings")
      .select("provider, enabled_models, is_enabled")
      .eq("clerk_id", clerkId)
      .eq("is_enabled", true)

    if (error) {
      console.error("[user-provider-settings] Database error:", error)
      return new Map()
    }

    if (!data || data.length === 0) {
      console.log("[user-provider-settings] No provider settings found for user:", clerkId)
      return new Map()
    }

    // Convert to Map, parsing enabled_models JSON array
    const settingsMap = new Map<string, string[]>()

    for (const row of data) {
      try {
        // enabled_models is stored as JSON, parse it
        const models = Array.isArray(row.enabled_models)
          ? (row.enabled_models as string[])
          : JSON.parse(row.enabled_models as string)

        if (Array.isArray(models) && models.length > 0) {
          settingsMap.set(row.provider, models)
        }
      } catch (parseError) {
        console.warn(
          `[user-provider-settings] Failed to parse enabled_models for provider ${row.provider}:`,
          parseError,
        )
      }
    }

    console.log(
      `[user-provider-settings] Loaded settings for ${settingsMap.size} providers:`,
      Array.from(settingsMap.keys()),
    )

    return settingsMap
  } catch (error) {
    console.error("[user-provider-settings] Failed to fetch provider settings:", error)
    return new Map()
  }
}
