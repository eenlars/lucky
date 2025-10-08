import type { LuckyProvider } from "@lucky/shared"

export interface ProviderConfig {
  name: string
  slug: LuckyProvider
  description: string
  apiKeyName: string
  apiKeyPrefix: string
  icon: string
  docsUrl: string
  keysUrl: string
  defaultModelsCount: number
}

export const PROVIDER_CONFIGS: Record<LuckyProvider, ProviderConfig> = {
  openai: {
    name: "OpenAI",
    slug: "openai",
    description: "Direct access to GPT models from OpenAI",
    apiKeyName: "OPENAI_API_KEY",
    apiKeyPrefix: "sk-",
    icon: "🤖",
    docsUrl: "https://platform.openai.com/docs",
    keysUrl: "https://platform.openai.com/api-keys",
    defaultModelsCount: 8,
  },
  groq: {
    name: "Groq",
    slug: "groq",
    description: "Ultra-fast inference with Groq's LPU",
    apiKeyName: "GROQ_API_KEY",
    apiKeyPrefix: "gsk_",
    icon: "⚡",
    docsUrl: "https://console.groq.com/docs",
    keysUrl: "https://console.groq.com/keys",
    defaultModelsCount: 12,
  },
  openrouter: {
    name: "OpenRouter",
    slug: "openrouter",
    description: "Access to 100+ models from multiple providers",
    apiKeyName: "OPENROUTER_API_KEY",
    apiKeyPrefix: "sk-or-v1-",
    icon: "🌐",
    docsUrl: "https://openrouter.ai/docs",
    keysUrl: "https://openrouter.ai/keys",
    defaultModelsCount: 150,
  },
}

export function validateApiKey(provider: LuckyProvider, apiKey: string): { valid: boolean; error?: string } {
  if (!apiKey || !apiKey.trim()) {
    return { valid: false, error: "API key cannot be empty" }
  }

  const config = PROVIDER_CONFIGS[provider]

  // Check prefix
  if (!apiKey.startsWith(config.apiKeyPrefix)) {
    return {
      valid: false,
      error: `${config.name} API keys must start with "${config.apiKeyPrefix}"`,
    }
  }

  // Check minimum length
  const minLength = config.apiKeyPrefix.length + 20
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
  provider: LuckyProvider,
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
    return { success: false, error: "Network error during connection test" }
  }
}

export function getEnabledModelsKey(provider: LuckyProvider): string {
  return `${provider}_enabled_models`
}

export function getProviderStatus(
  apiKey: string | undefined,
  enabledModels: Set<string>,
): "configured" | "partial" | "unconfigured" {
  if (!apiKey) return "unconfigured"
  if (enabledModels.size === 0) return "partial"
  return "configured"
}
