import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import { GATEWAYS, findModel } from "@lucky/models"
import type { LuckyGateway } from "@lucky/shared"

export type RequiredGateways = {
  gateways: Set<LuckyGateway>
  models: Map<LuckyGateway, string[]>
}

/**
 * Extracts gateways and models required by a workflow configuration
 */
export function extractRequiredGateways(config: WorkflowConfig): RequiredGateways {
  const gateways = new Set<LuckyGateway>()
  const models = new Map<LuckyGateway, string[]>()

  for (const nodeConfig of config.nodes) {
    const { gatewayModelId, nodeId } = nodeConfig
    if (!gatewayModelId) continue

    const catalogEntry = findModel(gatewayModelId)
    if (!catalogEntry) {
      console.warn(`Model not found in catalog: ${gatewayModelId} (node: ${nodeId})`)
      continue
    }

    const { gateway } = catalogEntry
    gateways.add(gateway)

    const gatewayModels = models.get(gateway) ?? []
    gatewayModels.push(gatewayModelId)
    models.set(gateway, gatewayModels)
  }

  return { gateways, models }
}

/**
 * Map gateway names to their API key environment variable names
 */
export function getProviderKeyName(provider: string): string {
  const providerEntry = GATEWAYS.find(p => p.gateway === provider.toLowerCase())
  if (providerEntry) {
    return providerEntry.secretKeyName
  }
  // Fallback for unknown gateways (e.g., Anthropic)
  return `${provider.toUpperCase()}_API_KEY`
}

/**
 * Map API key names to user-friendly gateway display names
 * For unknown keys, converts HUGGING_FACE_API_KEY -> "Hugging Face"
 */
export function getProviderDisplayName(keyName: string): string {
  // Look up in PROVIDERS first
  const providerEntry = GATEWAYS.find(p => p.secretKeyName === keyName)
  if (providerEntry) {
    return providerEntry.displayName
  }

  // Known legacy gateways not in GATEWAYS
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
