/**
 * Gateway key extraction, validation, and formatting utilities
 */

import { findModel } from "./llm-catalog/catalog-queries"
import { GATEWAYS } from "./llm-catalog/providers"

/**
 * Common gateway API keys to check as fallback
 * Derived from GATEWAYS catalog + legacy Anthropic support
 */
export const GATEWAY_API_KEYS = [
  ...GATEWAYS.map(p => p.secretKeyName),
  "ANTHROPIC_API_KEY", // Legacy support - not in catalog
] as const

/**
 * Extract required gateway API keys from a list of model names
 *
 * @param gatewayModelIds - Array of model IDs in format "gateway#model" or just "model"
 * @returns Array of required API key names (e.g., ["OPENAI_API_KEY", "GROQ_API_KEY"])
 * @throws Error if any model is not found in the catalog
 *
 * @example
 * getRequiredGatewayKeys(["gpt-4o", "llama-3.1-8b"])
 * // Returns: ["OPENAI_API_KEY", "GROQ_API_KEY"]
 *
 * getRequiredGatewayKeys(["gpt-4o", "gpt-4o-mini"])
 * // Returns: ["OPENAI_API_KEY"] (deduplicated)
 */
export function getRequiredGatewayKeys(gatewayModelIds: string[]): string[] {
  const requiredGateways = new Set<string>()
  const unknownModels: string[] = []

  for (const gatewayModelId of gatewayModelIds) {
    // Try to find by full ID or name (auto-detect)
    const catalogEntry = findModel(gatewayModelId)

    if (!catalogEntry) {
      unknownModels.push(gatewayModelId)
      continue
    }

    requiredGateways.add(catalogEntry.gateway)
  }

  // If any models weren't found, throw an error
  if (unknownModels.length > 0) {
    throw new Error(
      `The following models were not found in the catalog: ${unknownModels.join(", ")}. Please use valid model IDs in the format "gateway#model" (e.g., "gpt-4o").`,
    )
  }

  // Convert gateway names to API key names
  const apiKeys = Array.from(requiredGateways).map(getGatewayKeyName)

  return apiKeys
}

/**
 * Map gateway name to its API key environment variable name
 *
 * @param gateway - Gateway name (e.g., "openai-api", "groq-api")
 * @returns API key name (e.g., "OPENAI_API_KEY")
 */
export function getGatewayKeyName(gateway: string): string {
  const gatewayEntry = GATEWAYS.find(p => p.gateway === gateway.toLowerCase())
  if (gatewayEntry) {
    return gatewayEntry.secretKeyName
  }
  // Fallback for unknown gateways
  return `${gateway.toUpperCase()}_API_KEY`
}

/**
 * Map API key name to user-friendly gateway display name
 *
 * @param keyName - API key name (e.g., "OPENAI_API_KEY")
 * @returns Display name (e.g., "OpenAI")
 *
 * @example
 * getGatewayDisplayName("OPENAI_API_KEY") // "OpenAI"
 * getGatewayDisplayName("GROQ_API_KEY") // "Groq"
 * getGatewayDisplayName("HUGGING_FACE_API_KEY") // "Hugging Face"
 */
export function getGatewayDisplayName(keyName: string): string {
  // Look up in GATEWAYS first
  const gatewayEntry = GATEWAYS.find(p => p.secretKeyName === keyName)
  if (gatewayEntry) {
    return gatewayEntry.displayName
  }

  // Known legacy gateways not in GATEWAYS
  if (keyName === "ANTHROPIC_API_KEY") {
    return "Anthropic"
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
 * Validate that all required gateway keys are present
 *
 * @param requiredKeys - Array of required API key names
 * @param apiKeys - Object with API keys (key name -> value)
 * @returns Array of missing key names, or empty array if all present
 *
 * @example
 * const required = ["OPENAI_API_KEY", "GROQ_API_KEY"]
 * const provided = { OPENAI_API_KEY: "sk-..." }
 * validateGatewayKeys(required, provided) // ["GROQ_API_KEY"]
 */
export function validateGatewayKeys(requiredKeys: string[], apiKeys: Record<string, string | undefined>): string[] {
  return requiredKeys.filter(keyName => !apiKeys[keyName])
}

/**
 * Convert array of missing API key names to user-friendly gateway names
 *
 * @param missingKeys - Array of missing API key names
 * @returns Array of gateway display names
 *
 * @example
 * formatMissingGateways(["OPENAI_API_KEY", "GROQ_API_KEY"])
 * // Returns: ["OpenAI", "Groq"]
 */
export function formatMissingGateways(missingKeys: string[]): string[] {
  return missingKeys.map(getGatewayDisplayName)
}
