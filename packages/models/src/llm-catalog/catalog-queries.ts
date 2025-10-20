/**
 * catalog query and filter functions
 */

import type { LuckyProvider, ModelEntry, ModelId } from "@lucky/shared"
import { isNir } from "@lucky/shared"
import { MODEL_CATALOG } from "./catalog"

/**
 * returns the full model catalog
 */
export function getCatalog(): ModelEntry[] {
  return MODEL_CATALOG
}

/**
 * Find model by ID (format: "provider#model")
 * Case-insensitive matching
 *
 * @param id - Full model ID like "openai#gpt-4o"
 * @returns Model entry if found, undefined otherwise
 *
 * @example
 * findModelById("openai#gpt-4o")     // → ModelEntry for GPT-4o
 * findModelById("OPENAI#GPT-4O")     // → Same model (case-insensitive)
 * findModelById("gpt-4o")            // → undefined (needs provider prefix)
 */
function findModelById(id: string): ModelEntry | undefined {
  if (isNir(id)) {
    return undefined
  }
  return MODEL_CATALOG.find(m => m.id.toLowerCase() === id.toLowerCase())
}

/**
 * Find model by name without provider prefix
 * Matches model name in multiple ways for flexibility:
 * 1. Exact match against model name field
 * 2. Match against model part after # in ID
 * 3. Full ID match (fallback)
 *
 * @param inputName - Model name like "gpt-4o" or full ID
 * @returns First matching model entry, undefined if not found
 *
 * @example
 * findModelByName("gpt-4o")          // → ModelEntry for GPT-4o
 * findModelByName("openai#gpt-4o")   // → Same model (full ID match)
 * findModelByName("GPT-4O")          // → Same model (case-insensitive)
 */
function findModelByName(inputName: ModelId): ModelEntry | undefined {
  if (isNir(inputName)) {
    return undefined
  }
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

export function findModel(id: string): ModelEntry | undefined {
  const idModel = findModelById(id)
  const nameModel = findModelByName(id)
  return idModel || nameModel
}

export const toNormalModelName = (model: string) => {
  let normalizedModel = model.trim()
  if (model.includes("#")) {
    const [_provider, modelName] = normalizedModel.split("#")
    normalizedModel = modelName?.trim() ?? normalizedModel
  }
  if (!normalizedModel) {
    throw new Error(`Invalid model: ${model}`)
  }
  return normalizedModel
}

/**
 * returns all models for a provider
 * case-sensitive, returns empty array if not found
 */
export function getModelsByProvider(provider: LuckyProvider): ModelEntry[] {
  if (isNir(provider)) {
    return []
  }
  return MODEL_CATALOG.filter(m => m.provider === provider)
}

/**
 * returns only runtime-enabled models for a provider
 * filters out models where runtimeEnabled === false
 */
export function getActiveModelsByProvider(provider: string): ModelEntry[] {
  if (isNir(provider)) {
    return []
  }
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
