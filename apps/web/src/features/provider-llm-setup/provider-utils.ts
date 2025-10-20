import { logException } from "@/lib/error-logger"
import { getGatewayInfo } from "@lucky/models"
import { GATEWAYS } from "@lucky/models/llm-catalog/providers"
import type { LuckyGateway } from "@lucky/shared/contracts/llm-contracts/providers"
import type { LucideIcon } from "lucide-react"
import { Bot } from "lucide-react"

export interface ProviderConfig {
  name: string
  slug: string
  description: string
  /** Environment variable name for the API key (e.g., "OPENAI_API_KEY") */
  secretKeyName: string
  /** Prefix that appears in actual API key values (e.g., "sk-" for OpenAI) */
  apiKeyValuePrefix: string
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
  Omit<ProviderConfig, "slug" | "defaultModelsCount" | "secretKeyName" | "apiKeyValuePrefix">
> = {
  "openai-api": {
    name: "OpenAI",
    description: "Direct access to GPT models from OpenAI",
    logo: "/logos/openai.svg",
    docsUrl: "https://platform.openai.com/docs",
    keysUrl: "https://platform.openai.com/api-keys",
  },
  "groq-api": {
    name: "Groq",
    description: "Ultra-fast inference with Groq's LPU",
    logo: "/logos/groq.svg",
    docsUrl: "https://console.groq.com/docs",
    keysUrl: "https://console.groq.com/keys",
    disabled: !isDevelopment, // Enabled in development
  },
  "openrouter-api": {
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
  const providerInfo = getGatewayInfo()
  const configs: Record<string, ProviderConfig> = {}

  for (const info of providerInfo) {
    const metadata = PROVIDER_METADATA[info.name]
    const providerEntry = GATEWAYS.find(p => p.gateway === info.name)

    if (metadata && providerEntry) {
      configs[info.name] = {
        ...metadata,
        slug: info.name,
        secretKeyName: providerEntry.secretKeyName,
        apiKeyValuePrefix: providerEntry.apiKeyValuePrefix,
        defaultModelsCount: info.activeModels,
      }
    } else {
      // Fallback for providers not in metadata
      configs[info.name] = {
        name: info.name.charAt(0).toUpperCase() + info.name.slice(1),
        slug: info.name,
        description: `${info.activeModels} models available`,
        secretKeyName: providerEntry?.secretKeyName || `${info.name.toUpperCase()}_API_KEY`,
        apiKeyValuePrefix: providerEntry?.apiKeyValuePrefix || "",
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
export function getEnabledGatewaySlugs(configs: Record<string, ProviderConfig> = getProviderConfigs()): string[] {
  return Object.keys(configs).filter(gateway => !configs[gateway].disabled)
}

export function validateApiKey(gateway: LuckyGateway, apiKey: string): { valid: boolean; error?: string } {
  if (!apiKey || !apiKey.trim()) {
    return { valid: false, error: "API key cannot be empty" }
  }

  const config = getProviderConfigs()[gateway]

  if (!config) {
    return { valid: false, error: `Unknown  ${gateway}` }
  }

  // Skip prefix check if provider has no prefix defined
  if (config.apiKeyValuePrefix && !apiKey.startsWith(config.apiKeyValuePrefix)) {
    return {
      valid: false,
      error: `${config.name} API keys must start with "${config.apiKeyValuePrefix}"`,
    }
  }

  // Check minimum length
  const minLength = config.apiKeyValuePrefix ? config.apiKeyValuePrefix.length + 20 : 20
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
  gateway: LuckyGateway,
  apiKey: string,
): Promise<{ success: boolean; error?: string; modelCount?: number }> {
  try {
    const response = await fetch("/api/providers/test-connection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gateway, apiKey }),
    })

    const result = await response.json()

    if (!response.ok) {
      return { success: false, error: result.error || "Connection test failed" }
    }

    return { success: true, modelCount: result.modelCount }
  } catch (_error) {
    logException(_error, {
      location: "apps/web/src/features/provider-llm-setup/provider-utils.ts",
    })
    return { success: false, error: "Network error during connection test" }
  }
}
