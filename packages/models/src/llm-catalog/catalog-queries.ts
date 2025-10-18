/**
 * catalog query and filter functions
 */

import type { ModelEntry, ModelId } from "@lucky/shared"
import { MODEL_CATALOG } from "./catalog"

/**
 * returns the full model catalog
 */
export function getCatalog(): ModelEntry[] {
  return MODEL_CATALOG
}

/**
 * finds model by ID (format: "provider#model")
 * case-insensitive
 */
export function findModelById(id: string): ModelEntry | undefined {
  return MODEL_CATALOG.find(m => m.id.toLowerCase() === id.toLowerCase())
}

/**
 * finds model by name without provider prefix
 * matches exact model name or suffix after #
 */
export function findModelByName(inputName: ModelId): ModelEntry | undefined {
  const normalizedInputName = inputName.toLowerCase()
  for (const m of MODEL_CATALOG) {
    const modelIdMatches = m.id.split("#")[1]?.toLowerCase() === normalizedInputName
    const modelNameMatches = m.model.toLowerCase() === normalizedInputName
    const modelIdFullMatches = m.id.toLowerCase() === normalizedInputName
    if (modelIdMatches || modelNameMatches || modelIdFullMatches) {
      return m
    }
  }
  return undefined
}

/**
 * @deprecated use findModelById instead
 */
export function findModel(id: string): ModelEntry | undefined {
  return findModelById(id)
}

/**
 * returns all models for a provider
 * case-sensitive, returns empty array if not found
 */
export function getModelsByProvider(provider: string): ModelEntry[] {
  return MODEL_CATALOG.filter(m => m.provider === provider)
}

/**
 * returns only runtime-enabled models for a provider
 * filters out models where runtimeEnabled === false
 */
export function getActiveModelsByProvider(provider: string): ModelEntry[] {
  return MODEL_CATALOG.filter(m => m.provider === provider && m.runtimeEnabled !== false)
}

/**
 * returns all models where runtimeEnabled !== false
 */
export function getRuntimeEnabledModels(): ModelEntry[] {
  return MODEL_CATALOG.filter(m => m.runtimeEnabled !== false)
}

/**
 * returns sorted list of providers with runtime-enabled models
 */
export function getRuntimeEnabledProviders(): string[] {
  const providers = new Set<string>()
  MODEL_CATALOG.forEach(m => {
    if (m.runtimeEnabled !== false) {
      providers.add(m.provider)
    }
  })
  return Array.from(providers).sort()
}

/**
 * returns sorted list of all providers (regardless of runtimeEnabled)
 */
export function getAllProviders(): string[] {
  const providers = new Set<string>()
  MODEL_CATALOG.forEach(m => providers.add(m.provider))
  return Array.from(providers).sort()
}

/**
 * returns provider names with count of active models
 * only includes providers with runtime-enabled models
 */
export function getProviderInfo(): Array<{
  name: string
  activeModels: number
}> {
  const providers = getRuntimeEnabledProviders()
  return providers.map(provider => ({
    name: provider,
    activeModels: getActiveModelsByProvider(provider).length,
  }))
}
