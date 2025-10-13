import { logException } from "@/lib/error-logger"
import { getProviderInfo } from "@lucky/models"
import { type ProviderAvailability, resolveProviderAvailability } from "@lucky/shared/contracts/config"
import type { LucideIcon } from "lucide-react"
import { Bot } from "lucide-react"

export interface ProviderConfig {
  name: string
  slug: string
  description: string
  apiKeyName: string
  apiKeyPrefix: string
  icon?: LucideIcon
  logo?: string
  docsUrl: string
  keysUrl: string
  defaultModelsCount: number
  disabled?: boolean
}

/**
 * Provider metadata - static configuration for each provider
 * This is the only place where provider-specific metadata should be defined
 */
const PROVIDER_METADATA: Record<string, Omit<ProviderConfig, "slug" | "defaultModelsCount">> = {
  openai: {
    name: "OpenAI",
    description: "Direct access to GPT models from OpenAI",
    apiKeyName: "OPENAI_API_KEY",
    apiKeyPrefix: "sk-",
    logo: "/logos/openai.svg",
    docsUrl: "https://platform.openai.com/docs",
    keysUrl: "https://platform.openai.com/api-keys",
  },
  groq: {
    name: "Groq",
    description: "Ultra-fast inference with Groq's LPU",
    apiKeyName: "GROQ_API_KEY",
    apiKeyPrefix: "gsk_",
    logo: "/logos/groq.svg",
    docsUrl: "https://console.groq.com/docs",
    keysUrl: "https://console.groq.com/keys",
  },
  openrouter: {
    name: "OpenRouter",
    description: "Access to 100+ models from multiple providers",
    apiKeyName: "OPENROUTER_API_KEY",
    apiKeyPrefix: "sk-or-v1-",
    logo: "/logos/openrouter.svg",
    docsUrl: "https://openrouter.ai/docs",
    keysUrl: "https://openrouter.ai/keys",
  },
}

/**
 * Get provider configurations dynamically from MODEL_CATALOG
 * This merges static metadata with dynamic model counts from the catalog
 * and disabled state from provider availability (defaults + runtime overrides)
 *
 * @param availabilityOverrides - Optional runtime provider availability overrides.
 *                                 When provided, these are merged with defaults via resolveProviderAvailability().
 *                                 When omitted, uses default availability (all providers enabled).
 */
export function getProviderConfigs(
  availabilityOverrides?: Partial<ProviderAvailability> | null,
): Record<string, ProviderConfig> {
  const providerInfo = getProviderInfo()
  const availability = resolveProviderAvailability(availabilityOverrides)
  const configs: Record<string, ProviderConfig> = {}

  for (const info of providerInfo) {
    const metadata = PROVIDER_METADATA[info.name]
    const isDisabled = !availability[info.name as keyof typeof availability]

    if (metadata) {
      configs[info.name] = {
        ...metadata,
        slug: info.name,
        defaultModelsCount: info.activeModels,
        disabled: isDisabled,
      }
    } else {
      // Fallback for providers not in metadata
      configs[info.name] = {
        name: info.name.charAt(0).toUpperCase() + info.name.slice(1),
        slug: info.name,
        description: `${info.activeModels} models available`,
        apiKeyName: `${info.name.toUpperCase()}_API_KEY`,
        apiKeyPrefix: "",
        icon: Bot,
        docsUrl: "",
        keysUrl: "",
        defaultModelsCount: info.activeModels,
        disabled: isDisabled,
      }
    }
  }

  return configs
}

/**
 * Get provider configurations with runtime availability from core config.
 * Use this in server-side contexts (API routes, server components) where core config is available.
 *
 * @example
 * ```ts
 * // In an API route
 * import { getProviderConfigsFromCore } from '@/lib/providers/provider-utils'
 * const configs = getProviderConfigsFromCore()
 * ```
 */
export function getProviderConfigsFromCore(): Record<string, ProviderConfig> {
  try {
    // Dynamically import to avoid issues in client-only contexts
    const { getCoreConfig } = require("@lucky/core/core-config/coreConfig")
    const coreConfig = getCoreConfig()
    return getProviderConfigs(coreConfig.models.availability)
  } catch {
    // Fallback to defaults if core config is not available (e.g., client-side)
    return getProviderConfigs()
  }
}

/**
 * Legacy export for backwards compatibility.
 * Uses default availability (all providers enabled).
 *
 * @deprecated Use getProviderConfigs() with availability overrides or getProviderConfigsFromCore() instead
 */
export const PROVIDER_CONFIGS = getProviderConfigs()

export function validateApiKey(provider: string, apiKey: string): { valid: boolean; error?: string } {
  if (!apiKey || !apiKey.trim()) {
    return { valid: false, error: "API key cannot be empty" }
  }

  const config = PROVIDER_CONFIGS[provider]

  if (!config) {
    return { valid: false, error: `Unknown provider: ${provider}` }
  }

  // Skip prefix check if provider has no prefix defined
  if (config.apiKeyPrefix && !apiKey.startsWith(config.apiKeyPrefix)) {
    return {
      valid: false,
      error: `${config.name} API keys must start with "${config.apiKeyPrefix}"`,
    }
  }

  // Check minimum length
  const minLength = config.apiKeyPrefix ? config.apiKeyPrefix.length + 20 : 20
  if (apiKey.length < minLength) {
    return {
      valid: false,
      error: `API key appears too short (minimum ${minLength} characters)`,
    }
  }

  // Check for whitespace
  if (apiKey !== apiKey.trim()) {
    return {
      valid: false,
      error: "API key contains leading or trailing whitespace",
    }
  }

  return { valid: true }
}

export async function testConnection(
  provider: string,
  apiKey: string,
): Promise<{ success: boolean; error?: string; modelCount?: number }> {
  try {
    const response = await fetch("/api/providers/test-connection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, apiKey }),
    })

    const result = await response.json()

    if (!response.ok) {
      return { success: false, error: result.error || "Connection test failed" }
    }

    return { success: true, modelCount: result.modelCount }
  } catch (_error) {
    logException(_error, {
      location: "/lib/providers/provider-utils",
    })
    return { success: false, error: "Network error during connection test" }
  }
}

export function getProviderStatus(
  apiKey: string | undefined,
  enabledModels: Set<string>,
): "configured" | "partial" | "unconfigured" {
  if (!apiKey) return "unconfigured"
  if (enabledModels.size === 0) return "partial"
  return "configured"
}
