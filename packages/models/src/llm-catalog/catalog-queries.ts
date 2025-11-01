/**
 * catalog query and filter functions
 */

import type { LuckyGateway, ModelEntry, ModelId } from "@lucky/shared"
import { isNir } from "@lucky/shared"
import { MODEL_CATALOG } from "./catalog"

/**
 * returns the full model catalog
 */
export function getCatalog(): ModelEntry[] {
  return MODEL_CATALOG
}

/**
 * Find model by name without gateway prefix
 * Matches model name in multiple ways for flexibility:
 * 1. Exact match against gatewayModelId
 * 2. Match against model part after # in ID
 * 3. Full ID match (fallback)
 *
 * @param inputName - Model name like "gpt-4o" or full ID like "gpt-4o"
 * @returns First matching model entry, undefined if not found
 *
 * @example
 * findModelByName("gpt-4o")          // → ModelEntry for GPT-4o
 * findModelByName("gpt-4o")   // → Same model (full ID match)
 * findModelByName("GPT-4O")          // → Same model (case-insensitive)
 */
export function findModel(inputName: ModelId): ModelEntry | undefined {
  if (isNir(inputName)) {
    return undefined
  }

  const normalizedInput = inputName.trim().toLowerCase()

  for (const model of MODEL_CATALOG) {
    const normalizedGatewayModelId = model.gatewayModelId.toLowerCase()
    const legacyId = `${model.gateway}#${model.gatewayModelId}`.toLowerCase()

    // Check all possible match patterns:
    // 1. Exact case-sensitive match with gatewayModelId
    if (model.gatewayModelId === normalizedInput) {
      return model
    }

    // 2. Case-insensitive match with gatewayModelId
    if (normalizedGatewayModelId === normalizedInput) {
      return model
    }

    // 3. legacyId ID match (gateway#modelId format)
    if (legacyId === normalizedInput) {
      return model
    }

    // 4. Match just the model part after # (backwards compatibility)
    const modelIdFromFullId = legacyId.split("#")[1]
    if (modelIdFromFullId === normalizedInput) {
      return model
    }
  }

  return undefined
}

/**
 * returns all models for a gateway
 * case-sensitive, returns empty array if not found
 */
export function getModelsByGateway(gateway: LuckyGateway): ModelEntry[] {
  if (isNir(gateway)) {
    return []
  }
  return MODEL_CATALOG.filter(m => m.gateway === gateway)
}

/**
 * returns only runtime-enabled models for a gateway
 * filters out models where runtimeEnabled === false
 */
export function getActiveModelsByGateway(gateway: LuckyGateway): ModelEntry[] {
  if (isNir(gateway)) {
    return []
  }
  return MODEL_CATALOG.filter(m => m.gateway === gateway && m.runtimeEnabled !== false)
}

/**
 * returns all models where runtimeEnabled !== false
 */
export function getRuntimeEnabledModels(): ModelEntry[] {
  return MODEL_CATALOG.filter(m => m.runtimeEnabled !== false)
}

/**
 * returns sorted list of gateways with runtime-enabled models
 */
export function getRuntimeEnabledGateways(): string[] {
  const gateways = new Set<string>()
  MODEL_CATALOG.forEach(m => {
    if (m.runtimeEnabled !== false) {
      gateways.add(m.gateway)
    }
  })
  return Array.from(gateways).sort()
}

/**
 * returns sorted list of all gateways (regardless of runtimeEnabled)
 */
export function getAllGateways(): string[] {
  const gateways = new Set<string>()
  MODEL_CATALOG.forEach(m => gateways.add(m.gateway))
  return Array.from(gateways).sort()
}

/**
 * returns gateway names with count of active models
 * only includes gateways with runtime-enabled models
 */
export function getGatewayInfo(): Array<{
  name: string
  activeModels: number
}> {
  const gateways = getRuntimeEnabledGateways()
  return gateways.map(gateway => ({
    name: gateway,
    activeModels: getActiveModelsByGateway(gateway as LuckyGateway).length,
  }))
}
