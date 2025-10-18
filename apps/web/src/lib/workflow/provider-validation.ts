import { logException } from "@/lib/error-logger"
import {
  extractRequiredProviders,
  getProviderDisplayName,
  getProviderKeyName,
} from "@lucky/core/workflow/provider-extraction"
import { FALLBACK_PROVIDER_KEYS } from "@lucky/models"
import type { WorkflowConfig } from "@lucky/shared/contracts/workflow"

// Re-export for backward compatibility
export { FALLBACK_PROVIDER_KEYS }

/**
 * Extract required provider API keys from workflow config
 * Returns fallback keys if extraction fails
 */
export function getRequiredProviderKeys(config: WorkflowConfig, context: string): string[] {
  try {
    const { providers } = extractRequiredProviders(config)
    const requiredKeys = Array.from(providers).map(getProviderKeyName)
    console.log(`[${context}] Workflow requires providers:`, Array.from(providers))
    console.log(`[${context}] Required API keys:`, requiredKeys)
    return requiredKeys
  } catch (error) {
    logException(error, {
      location: "/lib/workflow/provider-validation",
    })
    console.error(`[${context}] Failed to extract providers:`, error)
    return [...FALLBACK_PROVIDER_KEYS]
  }
}

/**
 * Validate that all required provider keys are present
 * Returns array of missing key names, or empty array if all present
 */
export function validateProviderKeys(requiredKeys: string[], apiKeys: Record<string, string | undefined>): string[] {
  return requiredKeys.filter(keyName => !apiKeys[keyName])
}

/**
 * Convert array of missing API key names to user-friendly provider display names
 * e.g., ["OPENAI_API_KEY", "GROQ_API_KEY"] -> ["OpenAI", "Groq"]
 */
export function formatMissingProviders(missingKeys: string[]): string[] {
  return missingKeys.map(getProviderDisplayName)
}
