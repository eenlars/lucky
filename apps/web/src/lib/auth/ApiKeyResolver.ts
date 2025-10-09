/**
 * API Key Resolver Service
 *
 * Resolves provider-specific API keys for authenticated users from the lockbox.
 * Handles decryption, caching, and model access validation.
 */

import type { ApiKeyResolver as IApiKeyResolver } from "@lucky/core/auth/types"
import type { LuckyProvider } from "@lucky/shared"
import { decryptGCM } from "@lucky/shared/crypto/lockbox"
import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Extract provider from model name.
 * Handles formats like "openai/gpt-4" or "anthropic/claude-sonnet".
 */
function extractProviderFromModel(modelName: string): LuckyProvider {
  const parts = modelName.split("/")

  if (parts.length >= 2) {
    const provider = parts[0].toLowerCase()
    // Validate it's a known provider
    if (provider === "openai" || provider === "groq" || provider === "openrouter") {
      return provider as LuckyProvider
    }
    // If has slash but provider unknown, likely OpenRouter format
    return "openrouter"
  }

  // No slash - could be tier name or bare model. Default to openrouter (most comprehensive)
  return "openrouter"
}

/**
 * Namespace for API keys in the lockbox.user_secrets table
 */
const API_KEYS_NAMESPACE = "api-keys"

/**
 * Cache entry for API keys (valid for single invocation)
 */
interface ApiKeyCacheEntry {
  key: string
  timestamp: number
}

/**
 * Cache entry for provider settings
 */
interface ProviderSettingsCacheEntry {
  isEnabled: boolean
  enabledModels: string[]
  timestamp: number
}

/**
 * API Key Resolver Implementation
 *
 * Provides user-scoped API key resolution with per-invocation caching.
 * Thread-safe for concurrent invocations (each invocation gets its own instance).
 */
export class ApiKeyResolver implements IApiKeyResolver {
  private apiKeyCache: Map<LuckyProvider, ApiKeyCacheEntry> = new Map()
  private providerSettingsCache: Map<LuckyProvider, ProviderSettingsCacheEntry> = new Map()
  private readonly cacheTTL = 300000 // 5 minutes

  constructor(
    private clerkId: string,
    private supabase: SupabaseClient,
  ) {}

  /**
   * Get the API key for a specific provider.
   * Fetches from lockbox.user_secrets with namespace 'api-keys'.
   * Results are cached for the duration of this invocation.
   *
   * @param provider - Provider identifier (openai, openrouter, groq)
   * @returns Decrypted API key or null if not configured
   */
  async getProviderApiKey(provider: LuckyProvider): Promise<string | null> {
    // Check cache first
    const cached = this.apiKeyCache.get(provider)
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.key
    }

    // Fetch from database
    const secretName = `${provider}_api_key`

    try {
      const { data, error } = await this.supabase
        .schema("lockbox")
        .from("user_secrets")
        .select("ciphertext, iv, auth_tag")
        .eq("clerk_id", this.clerkId)
        .eq("namespace", API_KEYS_NAMESPACE)
        .ilike("name", secretName)
        .eq("is_current", true)
        .is("deleted_at", null)
        .maybeSingle()

      if (error) {
        console.error(`[ApiKeyResolver] Database error fetching ${provider} API key:`, error)
        return null
      }

      if (!data) {
        // No API key configured for this provider
        return null
      }

      // Decrypt the API key
      const decryptedKey = decryptGCM({
        ciphertext: data.ciphertext,
        iv: data.iv,
        authTag: data.auth_tag,
      })

      // Cache the result
      this.apiKeyCache.set(provider, {
        key: decryptedKey,
        timestamp: Date.now(),
      })

      return decryptedKey
    } catch (_err) {
      console.error(`[ApiKeyResolver] Error fetching/decrypting ${provider} API key:`, _err)
      return null
    }
  }

  /**
   * Get list of models the user has enabled for a provider.
   * Fetches from lockbox.provider_settings table.
   * Results are cached for the duration of this invocation.
   *
   * @param provider - Provider identifier
   * @returns Array of enabled model names
   */
  async getEnabledModelsForProvider(provider: LuckyProvider): Promise<string[]> {
    // Check cache first
    const cached = this.providerSettingsCache.get(provider)
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.isEnabled ? cached.enabledModels : []
    }

    // Fetch from database
    try {
      const { data, error } = await this.supabase
        .schema("lockbox")
        .from("provider_settings")
        .select("enabled_models, is_enabled")
        .eq("clerk_id", this.clerkId)
        .eq("provider", provider)
        .maybeSingle()

      if (error) {
        console.error(`[ApiKeyResolver] Database error fetching ${provider} settings:`, error)
        return []
      }

      if (!data || !data.is_enabled) {
        // Provider not enabled or no settings configured
        this.providerSettingsCache.set(provider, {
          isEnabled: false,
          enabledModels: [],
          timestamp: Date.now(),
        })
        return []
      }

      const enabledModels = (data.enabled_models as string[]) || []

      // Cache the result
      this.providerSettingsCache.set(provider, {
        isEnabled: true,
        enabledModels,
        timestamp: Date.now(),
      })

      return enabledModels
    } catch (_err) {
      console.error(`[ApiKeyResolver] Error fetching ${provider} settings:`, _err)
      return []
    }
  }

  /**
   * Check if user has access to a specific model.
   * Validates that:
   * 1. Model's provider has an API key configured
   * 2. Model is in user's enabled models list
   *
   * @param modelName - Full model name to validate
   * @returns True if model is enabled for this user
   */
  async validateModelAccess(modelName: string): Promise<boolean> {
    // Determine which provider serves this model
    const provider = extractProviderFromModel(modelName)

    // Check if provider has API key
    const apiKey = await this.getProviderApiKey(provider)
    if (!apiKey) {
      return false
    }

    // Check if model is in enabled list
    const enabledModels = await this.getEnabledModelsForProvider(provider)

    // Special case: if enabled_models is empty, allow all models (backward compatibility)
    if (enabledModels.length === 0) {
      // Check if provider is explicitly enabled
      const cached = this.providerSettingsCache.get(provider)
      if (cached?.isEnabled) {
        return true
      }
    }

    return enabledModels.includes(modelName)
  }

  /**
   * Get all providers that the user has configured (has API key).
   * @returns Array of configured provider identifiers
   */
  async getAllConfiguredProviders(): Promise<LuckyProvider[]> {
    const providers: LuckyProvider[] = ["openai", "openrouter", "groq"]
    const configured: LuckyProvider[] = []

    for (const provider of providers) {
      const apiKey = await this.getProviderApiKey(provider)
      if (apiKey) {
        configured.push(provider)
      }
    }

    return configured
  }

  /**
   * Clear all caches (useful for testing or if settings change mid-invocation)
   */
  clearCache(): void {
    this.apiKeyCache.clear()
    this.providerSettingsCache.clear()
  }
}
