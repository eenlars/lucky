import { MODEL_CATALOG } from "@lucky/models/pricing/catalog"
import type { WorkflowConfig } from "@lucky/shared/contracts/workflow"

export type RequiredProviders = {
  providers: Set<string> // e.g., ["openai", "openrouter"]
  models: Map<string, string[]> // provider -> model IDs
}

/**
 * Extract all providers required by a workflow by analyzing node configs
 * Looks up each model in the catalog to determine which provider API it uses
 */
export function extractRequiredProviders(config: WorkflowConfig): RequiredProviders {
  const providers = new Set<string>()
  const models = new Map<string, string[]>()

  for (const nodeConfig of config.nodes) {
    const modelId = nodeConfig.modelName
    if (!modelId) continue

    // Look up model in catalog to find which provider API it uses
    const catalogEntry = MODEL_CATALOG.find(entry => entry.id === modelId)

    if (!catalogEntry) {
      console.warn(`[extractProviders] Model not found in catalog: ${modelId} (node: ${nodeConfig.nodeId})`)
      continue
    }

    const provider = catalogEntry.provider.toLowerCase()
    providers.add(provider)

    if (!models.has(provider)) {
      models.set(provider, [])
    }
    const providerModels = models.get(provider)
    if (providerModels) {
      providerModels.push(modelId)
    }
  }

  return { providers, models }
}

/**
 * Map provider names to their API key environment variable names
 */
export function getProviderKeyName(provider: string): string {
  const mapping: Record<string, string> = {
    openai: "OPENAI_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    groq: "GROQ_API_KEY",
  }
  return mapping[provider] || `${provider.toUpperCase()}_API_KEY`
}
