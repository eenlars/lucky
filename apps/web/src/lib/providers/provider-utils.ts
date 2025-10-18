import { logException } from "@/lib/error-logger"
import { getProviderInfo, PROVIDERS } from "@lucky/models"
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
 * In development mode, all providers are enabled for testing
 */
const isDevelopment = process.env.NODE_ENV === "development"

const PROVIDER_METADATA: Record<
  string,
  Omit<ProviderConfig, "slug" | "defaultModelsCount" | "apiKeyName" | "apiKeyPrefix">
> = {
  openai: {
    name: "OpenAI",
    description: "Direct access to GPT models from OpenAI",
    logo: "/logos/openai.svg",
    docsUrl: "https://platform.openai.com/docs",
    keysUrl: "https://platform.openai.com/api-keys",
  },
  groq: {
    name: "Groq",
    description: "Ultra-fast inference with Groq's LPU",
    logo: "/logos/groq.svg",
    docsUrl: "https://console.groq.com/docs",
    keysUrl: "https://console.groq.com/keys",
    disabled: !isDevelopment, // Enabled in development
  },
  openrouter: {
    name: "OpenRouter",
    description: "Access to 100+ models from multiple providers",
    logo: "/logos/openrouter.svg",
    docsUrl: "https://openrouter.ai/docs",
    keysUrl: "https://openrouter.ai/keys",
    disabled: !isDevelopment, // Enabled in development
  },
}

/**
 * Get provider configurations dynamically from MODEL_CATALOG
 * This merges static metadata with dynamic model counts from the catalog
 */
export function getProviderConfigs(): Record<string, ProviderConfig> {
  const providerInfo = getProviderInfo()
  const configs: Record<string, ProviderConfig> = {}

  for (const info of providerInfo) {
    const metadata = PROVIDER_METADATA[info.name]
    const providerEntry = PROVIDERS.find(p => p.provider === info.name)

    if (metadata && providerEntry) {
      configs[info.name] = {
        ...metadata,
        slug: info.name,
        apiKeyName: providerEntry.apiKeyName,
        apiKeyPrefix: providerEntry.apiKeyPrefix,
        defaultModelsCount: info.activeModels,
      }
    } else {
      // Fallback for providers not in metadata
      configs[info.name] = {
        name: info.name.charAt(0).toUpperCase() + info.name.slice(1),
        slug: info.name,
        description: `${info.activeModels} models available`,
        apiKeyName: providerEntry?.apiKeyName || `${info.name.toUpperCase()}_API_KEY`,
        apiKeyPrefix: providerEntry?.apiKeyPrefix || "",
        icon: Bot,
        docsUrl: "",
        keysUrl: "",
        defaultModelsCount: info.activeModels,
      }
    }
  }

  return configs
}

/**
 * Helper: return provider slugs for configurations that are not disabled
 */
export function getEnabledProviderSlugs(configs: Record<string, ProviderConfig> = getProviderConfigs()): string[] {
  return Object.entries(configs)
    .filter(([, config]) => !config.disabled)
    .map(([slug]) => slug)
}

export function validateApiKey(provider: string, apiKey: string): { valid: boolean; error?: string } {
  if (!apiKey || !apiKey.trim()) {
    return { valid: false, error: "API key cannot be empty" }
  }

  const config = getProviderConfigs()[provider]

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
