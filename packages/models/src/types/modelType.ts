import { type ModelProvider, ModelProviderSchema } from "@lucky/shared/contracts/config"
import { type CatalogId, catalogIdSchema } from "@lucky/shared/contracts/providers"

import { findModel } from "../pricing/model-lookup"

export type ModelType = CatalogId
export interface ParsedModelType {
  provider: ModelProvider
  model: string
}

/**
 * Format a catalog ID using the canonical "<provider>#<model>" shape.
 */
export const formatModelType = (provider: ModelProvider, model: string): ModelType =>
  `${provider}#${model}` as ModelType

/**
 * Type guard for catalog IDs / model types.
 */
export const isModelType = (value: unknown): value is ModelType =>
  typeof value === "string" && catalogIdSchema.safeParse(value).success

/**
 * Attempt to normalize a model identifier (either catalog ID or API name) into the canonical
 * "<provider>#<model>" format. Returns undefined if the model cannot be resolved.
 *
 * Note: Even canonical catalog IDs are validated against the catalog to ensure they exist.
 */
export const tryNormalizeModelType = (modelType: string | null | undefined): ModelType | undefined => {
  if (!modelType) return undefined

  // Always validate against catalog, even for canonical IDs
  const entry = findModel(modelType)
  if (!entry) return undefined

  const providerParse = ModelProviderSchema.safeParse(entry.provider)
  if (!providerParse.success) return undefined

  return formatModelType(providerParse.data, entry.model)
}

/**
 * Normalize a model identifier into the canonical "<provider>#<model>" format.
 * Throws when the identifier cannot be resolved to a known catalog entry.
 */
export const normalizeModelType = (modelType: string): ModelType => {
  const normalized = tryNormalizeModelType(modelType)
  if (!normalized) {
    throw new Error(`Unable to normalize model type: ${modelType}`)
  }
  return normalized
}

/**
 * Parse a catalog ID into provider + model components.
 * Accepts either canonical catalog IDs or legacy API-format model strings.
 */
export const parseModelType = (modelType: string): ParsedModelType => {
  const normalized = tryNormalizeModelType(modelType)
  if (!normalized) {
    throw new Error(`Invalid model type: ${modelType}`)
  }

  const separatorIndex = normalized.indexOf("#")
  if (separatorIndex === -1) {
    throw new Error(`Invalid model type: ${normalized}`)
  }

  const provider = ModelProviderSchema.parse(normalized.slice(0, separatorIndex)) as ModelProvider
  const model = normalized.slice(separatorIndex + 1)

  return { provider, model }
}

/**
 * Assert that a string is a valid catalog ID and return it with strong typing.
 */
export const assertModelType = (modelType: string): ModelType => {
  return normalizeModelType(modelType)
}
