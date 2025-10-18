import { findModelByName, PROVIDERS } from "@lucky/models"
import type { WorkflowConfig } from "@lucky/shared/contracts/workflow"

export type RequiredProviders = {
  providers: Set<string> // e.g., ["openai", "openrouter"]
  models: Map<string, string[]> // provider -> model names
}

/**
 * Extract all providers required by a workflow by analyzing node configs.
 * Looks up each model in the catalog to determine which provider API it uses.
 *
 * NOTE: Workflows store model names in API format (e.g., "gpt-4o-mini", "anthropic/claude-sonnet-4"),
 * not catalog IDs. We look up by the `model` field, not the `id` field.
 */
export function extractRequiredProviders(config: WorkflowConfig): RequiredProviders {
  const providers = new Set<string>()
  const models = new Map<string, string[]>()

  for (const nodeConfig of config.nodes) {
    const modelName = nodeConfig.modelName
    if (!modelName) continue

    // Look up model by its API name (the `model` field in catalog)
    const catalogEntry = findModelByName(modelName)

    if (!catalogEntry) {
      console.warn(`[extractProviders] Model not found in catalog: ${modelName} (node: ${nodeConfig.nodeId})`)
      continue
    }

    const provider = catalogEntry.provider.toLowerCase()
    providers.add(provider)

    if (!models.has(provider)) {
      models.set(provider, [])
    }
    const providerModels = models.get(provider)
    if (providerModels) {
      providerModels.push(modelName)
    }
  }

  return { providers, models }
}

/**
 * Map provider names to their API key environment variable names
 */
export function getProviderKeyName(provider: string): string {
  const providerEntry = PROVIDERS.find(p => p.provider === provider.toLowerCase())
  if (providerEntry) {
    return providerEntry.apiKeyName
  }
  // Fallback for unknown providers (e.g., Anthropic)
  return `${provider.toUpperCase()}_API_KEY`
}

/**
 * Map API key names to user-friendly provider display names
 * For unknown keys, converts HUGGING_FACE_API_KEY -> "Hugging Face"
 */
export function getProviderDisplayName(keyName: string): string {
  // Look up in PROVIDERS first
  const providerEntry = PROVIDERS.find(p => p.apiKeyName === keyName)
  if (providerEntry) {
    return providerEntry.displayName
  }

  // Known legacy providers not in PROVIDERS
  if (keyName === "ANTHROPIC_API_KEY") {
    return "Anthropic"
  }

  // Fallback: convert HUGGING_FACE_API_KEY -> "Hugging Face"
  // Remove _API_KEY suffix, split by underscore, capitalize each word, join with space
  return keyName
    .replace(/_API_KEY$/, "")
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}
