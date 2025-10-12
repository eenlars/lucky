/**
 * Model Catalog - Single source of truth for model definitions and pricing
 *
 * This catalog defines all available models across all providers with their
 * pricing, capabilities, and metadata. It replaces the legacy providersV2
 * from @lucky/shared.
 *
 * @module pricing/catalog
 */

/**
 * Complete model entry with pricing and capabilities
 */
export interface ModelEntry {
  // Identity
  id: string // Full ID: "openai/gpt-4o-mini"
  provider: string // Provider: "openai", "openrouter", "groq"
  model: string // Model name: "gpt-4o-mini"

  // Pricing (per 1M tokens in USD)
  input: number
  output: number
  cachedInput: number | null

  // Capabilities
  contextLength: number
  supportsTools: boolean
  supportsJsonMode: boolean
  supportsStreaming: boolean
  supportsVision: boolean

  // Performance & Quality
  speed: "fast" | "medium" | "slow"
  intelligence: number // 1-10 scale (from legacy "IQ")
  pricingTier: "low" | "medium" | "high"

  // Availability
  active: boolean
  regions?: string[]

  // Metadata
  description?: string
  releaseDate?: string
}

/**
 * Model catalog - comprehensive list of all available models
 *
 * Migrated from @lucky/shared providersV2 with enhanced capabilities metadata
 */
export const MODEL_CATALOG: ModelEntry[] = [
  // ============================================================================
  // OpenAI Direct API
  // ============================================================================

  {
    id: "openai/gpt-4.1-nano",
    provider: "openai",
    model: "gpt-4.1-nano",
    input: 0.1,
    output: 0.4,
    cachedInput: 0.025,
    contextLength: 1047576,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    speed: "fast",
    intelligence: 6,
    pricingTier: "low",
    active: true,
  },

  {
    id: "openai/gpt-4.1-mini",
    provider: "openai",
    model: "gpt-4.1-mini",
    input: 0.4,
    output: 1.6,
    cachedInput: 0.1,
    contextLength: 1047576,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    speed: "fast",
    intelligence: 7,
    pricingTier: "medium",
    active: true,
  },

  {
    id: "openai/gpt-4o-mini",
    provider: "openai",
    model: "gpt-4o-mini",
    input: 0.15,
    output: 0.6,
    cachedInput: 0.075,
    contextLength: 128000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
    speed: "fast",
    intelligence: 7,
    pricingTier: "low",
    active: true,
  },

  {
    id: "openai/gpt-3.5-turbo",
    provider: "openai",
    model: "gpt-3.5-turbo",
    input: 0.5,
    output: 1.5,
    cachedInput: null,
    contextLength: 16385,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    speed: "fast",
    intelligence: 6,
    pricingTier: "low",
    active: true,
  },

  {
    id: "openai/gpt-4",
    provider: "openai",
    model: "gpt-4",
    input: 30,
    output: 60,
    cachedInput: null,
    contextLength: 8192,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    speed: "slow",
    intelligence: 8,
    pricingTier: "high",
    active: true,
  },

  {
    id: "openai/gpt-4-turbo",
    provider: "openai",
    model: "gpt-4-turbo",
    input: 10,
    output: 30,
    cachedInput: null,
    contextLength: 128000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
    speed: "medium",
    intelligence: 8,
    pricingTier: "high",
    active: true,
  },

  {
    id: "openai/gpt-4o",
    provider: "openai",
    model: "gpt-4o",
    input: 2.5,
    output: 10,
    cachedInput: 1.25,
    contextLength: 128000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
    speed: "medium",
    intelligence: 8,
    pricingTier: "medium",
    active: true,
  },

  {
    id: "openai/gpt-4o-search-preview",
    provider: "openai",
    model: "gpt-4o-search-preview",
    input: 2.5,
    output: 10,
    cachedInput: 0.833333,
    contextLength: 128000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
    speed: "medium",
    intelligence: 8,
    pricingTier: "medium",
    active: true,
  },

  // ============================================================================
  // OpenRouter API
  // ============================================================================

  {
    id: "google/gemini-2.5-flash-lite",
    provider: "openrouter",
    model: "google/gemini-2.5-flash-lite",
    input: 0.15,
    output: 0.6,
    cachedInput: 0.06,
    contextLength: 1048576,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
    speed: "fast",
    intelligence: 5,
    pricingTier: "low",
    active: true,
  },

  {
    id: "google/gemini-2.5-pro-preview",
    provider: "openrouter",
    model: "google/gemini-2.5-pro-preview",
    input: 1.25,
    output: 10,
    cachedInput: 0.416667,
    contextLength: 1048576,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
    speed: "medium",
    intelligence: 7,
    pricingTier: "medium",
    active: false,
  },

  {
    id: "anthropic/claude-sonnet-4",
    provider: "openrouter",
    model: "anthropic/claude-sonnet-4",
    input: 3,
    output: 15,
    cachedInput: 1.166667,
    contextLength: 1047576,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
    speed: "medium",
    intelligence: 8,
    pricingTier: "medium",
    active: true,
  },

  {
    id: "switchpoint/router",
    provider: "openrouter",
    model: "switchpoint/router",
    input: 0.85,
    output: 3.4,
    cachedInput: 0.283333,
    contextLength: 131072,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    speed: "medium",
    intelligence: 8,
    pricingTier: "medium",
    active: true,
  },

  {
    id: "openai/gpt-4.1",
    provider: "openrouter",
    model: "openai/gpt-4.1",
    input: 12,
    output: 48,
    cachedInput: 4,
    contextLength: 128000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    speed: "medium",
    intelligence: 8,
    pricingTier: "medium",
    active: true,
  },

  {
    id: "openai/gpt-4.1-mini",
    provider: "openrouter",
    model: "openai/gpt-4.1-mini",
    input: 0.4,
    output: 1.6,
    cachedInput: 0.1,
    contextLength: 128000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    speed: "fast",
    intelligence: 7,
    pricingTier: "medium",
    active: true,
  },

  {
    id: "openai/gpt-4.1-nano",
    provider: "openrouter",
    model: "openai/gpt-4.1-nano",
    input: 0.15,
    output: 0.6,
    cachedInput: 0.06,
    contextLength: 128000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    speed: "medium",
    intelligence: 8,
    pricingTier: "medium",
    active: true,
  },

  {
    id: "openai/gpt-4o-mini",
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    input: 0.15,
    output: 0.6,
    cachedInput: 0.075,
    contextLength: 128000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
    speed: "fast",
    intelligence: 7,
    pricingTier: "low",
    active: true,
  },

  {
    id: "openai/gpt-3.5-turbo",
    provider: "openrouter",
    model: "openai/gpt-3.5-turbo",
    input: 0.5,
    output: 0.4,
    cachedInput: 0.025,
    contextLength: 16385,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    speed: "fast",
    intelligence: 6,
    pricingTier: "low",
    active: true,
  },

  {
    id: "openai/gpt-4o",
    provider: "openrouter",
    model: "openai/gpt-4o",
    input: 2.5,
    output: 10,
    cachedInput: 1.25,
    contextLength: 128000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
    speed: "medium",
    intelligence: 8,
    pricingTier: "medium",
    active: true,
  },

  {
    id: "anthropic/claude-3-5-haiku",
    provider: "openrouter",
    model: "anthropic/claude-3-5-haiku",
    input: 0.25,
    output: 1.25,
    cachedInput: 0.125,
    contextLength: 200000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
    speed: "fast",
    intelligence: 7,
    pricingTier: "low",
    active: true,
  },

  {
    id: "meta-llama/llama-3.1-8b-instruct",
    provider: "openrouter",
    model: "meta-llama/llama-3.1-8b-instruct",
    input: 0.055,
    output: 0.055,
    cachedInput: null,
    contextLength: 131072,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    speed: "fast",
    intelligence: 6,
    pricingTier: "low",
    active: true,
  },

  {
    id: "moonshotai/kimi-k2",
    provider: "openrouter",
    model: "moonshotai/kimi-k2",
    input: 0.5,
    output: 1.5,
    cachedInput: 0.1,
    contextLength: 128000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    speed: "medium",
    intelligence: 6,
    pricingTier: "medium",
    active: false,
  },

  {
    id: "moonshotai/kimi-k2-instruct",
    provider: "openrouter",
    model: "moonshotai/kimi-k2-instruct",
    input: 0.5,
    output: 1.5,
    cachedInput: 0.1,
    contextLength: 128000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    speed: "medium",
    intelligence: 6,
    pricingTier: "medium",
    active: false,
  },

  {
    id: "x-ai/grok-4",
    provider: "openrouter",
    model: "x-ai/grok-4",
    input: 2.0,
    output: 8.0,
    cachedInput: 0.5,
    contextLength: 131072,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    speed: "medium",
    intelligence: 7,
    pricingTier: "high",
    active: false,
  },

  {
    id: "mistralai/mistral-small-3.2-24b-instruct",
    provider: "openrouter",
    model: "mistralai/mistral-small-3.2-24b-instruct",
    input: 0.055,
    output: 0.055,
    cachedInput: 0.018333,
    contextLength: 131072,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    speed: "fast",
    intelligence: 6,
    pricingTier: "low",
    active: true,
  },

  {
    id: "openai/gpt-5",
    provider: "openrouter",
    model: "openai/gpt-5",
    input: 1.25,
    output: 10,
    cachedInput: 0.4,
    contextLength: 128000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
    speed: "medium",
    intelligence: 9,
    pricingTier: "medium",
    active: true,
  },

  // ============================================================================
  // Groq API
  // ============================================================================

  {
    id: "openai/gpt-oss-20b",
    provider: "groq",
    model: "openai/gpt-oss-20b",
    input: 0.5,
    output: 0.8,
    cachedInput: 0.1,
    contextLength: 131072,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    speed: "fast",
    intelligence: 7,
    pricingTier: "low",
    active: true,
  },

  {
    id: "openai/gpt-oss-120b",
    provider: "groq",
    model: "openai/gpt-oss-120b",
    input: 0.15,
    output: 0.75,
    cachedInput: 0.015,
    contextLength: 131072,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    speed: "fast",
    intelligence: 9,
    pricingTier: "low",
    active: true,
  },
]

/**
 * Helper: Get all active models
 */
export function getActiveModels(): ModelEntry[] {
  return MODEL_CATALOG.filter(m => m.active)
}

/**
 * Helper: Get models by provider
 */
export function getModelsByProvider(provider: string): ModelEntry[] {
  return MODEL_CATALOG.filter(m => m.provider === provider)
}

/**
 * Helper: Find model by ID
 */
export function findModelById(id: string): ModelEntry | undefined {
  return MODEL_CATALOG.find(m => m.id === id)
}

/**
 * Helper: Get all unique providers from the catalog
 * @throws {Error} If MODEL_CATALOG contains no providers
 */
export function getAllProviders(): string[] {
  if (MODEL_CATALOG.length === 0) {
    console.warn("[getAllProviders] MODEL_CATALOG is empty")
    throw new Error("MODEL_CATALOG contains no models")
  }

  const providers = new Set<string>()
  for (const model of MODEL_CATALOG) {
    providers.add(model.provider)
  }

  const result = Array.from(providers).sort()

  if (result.length === 0) {
    throw new Error("MODEL_CATALOG contains no valid providers")
  }

  return result
}

/**
 * Helper: Get all providers that have at least one active model
 */
export function getActiveProviders(): string[] {
  const providers = new Set<string>()
  for (const model of MODEL_CATALOG) {
    if (model.active) {
      providers.add(model.provider)
    }
  }
  return Array.from(providers).sort()
}

/**
 * Helper: Get provider configuration with model counts
 */
export interface ProviderInfo {
  name: string
  totalModels: number
  activeModels: number
  models: ModelEntry[]
}

export function getProviderInfo(): ProviderInfo[] {
  const providerMap = new Map<string, ModelEntry[]>()

  // Group models by provider
  for (const model of MODEL_CATALOG) {
    if (!providerMap.has(model.provider)) {
      providerMap.set(model.provider, [])
    }
    providerMap.get(model.provider)!.push(model)
  }

  // Build provider info
  return Array.from(providerMap.entries())
    .map(([name, models]) => ({
      name,
      totalModels: models.length,
      activeModels: models.filter(m => m.active).length,
      models,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Helper: Get catalog statistics
 */
export function getCatalogStats() {
  const active = getActiveModels()
  const providers = getAllProviders()
  const byProvider: Record<string, number> = {}

  for (const provider of providers) {
    byProvider[provider] = getModelsByProvider(provider).filter(m => m.active).length
  }

  return {
    total: MODEL_CATALOG.length,
    active: active.length,
    byProvider,
    byPricingTier: {
      low: active.filter(m => m.pricingTier === "low").length,
      medium: active.filter(m => m.pricingTier === "medium").length,
      high: active.filter(m => m.pricingTier === "high").length,
    },
  }
}

/**
 * Helper: Validate catalog integrity
 * Checks for common issues like non-lowercase providers, invalid ID formats, etc.
 */
export function validateCatalogIntegrity(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (MODEL_CATALOG.length === 0) {
    errors.push("MODEL_CATALOG is empty")
    return { valid: false, errors }
  }

  for (const model of MODEL_CATALOG) {
    // Check required fields first to avoid null/undefined errors in subsequent checks
    if (!model.provider || !model.model || !model.id) {
      errors.push(`Model ${model.id || "unknown"} is missing required fields`)
      continue // Skip other checks if required fields are missing
    }

    // Check provider is lowercase
    if (model.provider !== model.provider.toLowerCase()) {
      errors.push(`Model ${model.id} has non-lowercase provider: ${model.provider}`)
    }

    // Check ID format includes provider prefix
    if (!model.id.includes("/")) {
      errors.push(`Model ${model.id} has invalid ID format (missing '/' separator)`)
    }

    // Check pricing values are valid
    if (model.input < 0 || model.output < 0) {
      errors.push(`Model ${model.id} has negative pricing values`)
    }

    // Check context length is positive
    if (model.contextLength <= 0) {
      errors.push(`Model ${model.id} has invalid context length: ${model.contextLength}`)
    }
  }

  return { valid: errors.length === 0, errors }
}
