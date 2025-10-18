/**
 * Provider key extraction, validation, and formatting utilities
 */

import { findModelById, findModelByName } from "./llm-catalog/catalog-queries"

/**
 * Common provider API keys to check as fallback
 */
export const FALLBACK_PROVIDER_KEYS = [
  "OPENROUTER_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GROQ_API_KEY",
] as const

/**
 * Extract required provider API keys from a list of model names
 *
 * @param modelNames - Array of model IDs in format "provider#model" or just "model"
 * @returns Array of required API key names (e.g., ["OPENAI_API_KEY", "GROQ_API_KEY"])
 * @throws Error if any model is not found in the catalog
 *
 * @example
 * getRequiredProviderKeys(["openai#gpt-4o", "groq#llama-3.1-8b"])
 * // Returns: ["OPENAI_API_KEY", "GROQ_API_KEY"]
 *
 * getRequiredProviderKeys(["openai#gpt-4o", "openai#gpt-4o-mini"])
 * // Returns: ["OPENAI_API_KEY"] (deduplicated)
 */
export function getRequiredProviderKeys(modelNames: string[]): string[] {
  const requiredProviders = new Set<string>()
  const unknownModels: string[] = []

  for (const modelName of modelNames) {
    // Try to find by full ID first (provider#model format)
    let catalogEntry = findModelById(modelName)

    // If not found, try to find by name (auto-detect)
    if (!catalogEntry) {
      catalogEntry = findModelByName(modelName)
    }

    if (!catalogEntry) {
      unknownModels.push(modelName)
      continue
    }

    requiredProviders.add(catalogEntry.provider)
  }

  // If any models weren't found, throw an error
  if (unknownModels.length > 0) {
    throw new Error(
      `The following models were not found in the catalog: ${unknownModels.join(", ")}. Please use valid model IDs in the format "provider#model" (e.g., "openai#gpt-4o").`,
    )
  }

  // Convert provider names to API key names
  const apiKeys = Array.from(requiredProviders).map(getProviderKeyName)

  return apiKeys
}

/**
 * Map provider name to its API key environment variable name
 *
 * @param provider - Provider name (e.g., "openai", "groq")
 * @returns API key name (e.g., "OPENAI_API_KEY")
 */
export function getProviderKeyName(provider: string): string {
  const mapping: Record<string, string> = {
    openai: "OPENAI_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    groq: "GROQ_API_KEY",
  }
  return mapping[provider.toLowerCase()] || `${provider.toUpperCase()}_API_KEY`
}

/**
 * Map API key name to user-friendly provider display name
 *
 * @param keyName - API key name (e.g., "OPENAI_API_KEY")
 * @returns Display name (e.g., "OpenAI")
 *
 * @example
 * getProviderDisplayName("OPENAI_API_KEY") // "OpenAI"
 * getProviderDisplayName("GROQ_API_KEY") // "Groq"
 * getProviderDisplayName("HUGGING_FACE_API_KEY") // "Hugging Face"
 */
export function getProviderDisplayName(keyName: string): string {
  const mapping: Record<string, string> = {
    OPENAI_API_KEY: "OpenAI",
    OPENROUTER_API_KEY: "OpenRouter",
    ANTHROPIC_API_KEY: "Anthropic",
    GROQ_API_KEY: "Groq",
  }

  if (mapping[keyName]) {
    return mapping[keyName]
  }

  // Fallback: convert HUGGING_FACE_API_KEY -> "Hugging Face"
  // Remove _API_KEY suffix, split by underscore, capitalize each word
  return keyName
    .replace(/_API_KEY$/, "")
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

/**
 * Validate that all required provider keys are present
 *
 * @param requiredKeys - Array of required API key names
 * @param apiKeys - Object with API keys (key name -> value)
 * @returns Array of missing key names, or empty array if all present
 *
 * @example
 * const required = ["OPENAI_API_KEY", "GROQ_API_KEY"]
 * const provided = { OPENAI_API_KEY: "sk-..." }
 * validateProviderKeys(required, provided) // ["GROQ_API_KEY"]
 */
export function validateProviderKeys(requiredKeys: string[], apiKeys: Record<string, string | undefined>): string[] {
  return requiredKeys.filter(keyName => !apiKeys[keyName])
}

/**
 * Convert array of missing API key names to user-friendly provider names
 *
 * @param missingKeys - Array of missing API key names
 * @returns Array of provider display names
 *
 * @example
 * formatMissingProviders(["OPENAI_API_KEY", "GROQ_API_KEY"])
 * // Returns: ["OpenAI", "Groq"]
 */
export function formatMissingProviders(missingKeys: string[]): string[] {
  return missingKeys.map(getProviderDisplayName)
}
