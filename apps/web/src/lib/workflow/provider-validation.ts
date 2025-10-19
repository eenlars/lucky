import { logException } from "@/lib/error-logger"
import {
  FALLBACK_PROVIDER_IDS,
  PROVIDER_API_KEYS,
  getProviderDisplayName,
  getProviderKeyName,
} from "@lucky/core/providers"
import { type RequiredProviders, extractRequiredProviders } from "@lucky/core/workflow/provider-extraction"
import type { WorkflowConfig } from "@lucky/shared/contracts/workflow"

// Re-export for backward compatibility
export { PROVIDER_API_KEYS }

/**
 * Extract required provider API keys from workflow config
 * Returns fallback keys if extraction fails
 */
export function getRequiredProviderKeys(config: WorkflowConfig, context: string): RequiredProviders {
  try {
    const { providers, models } = extractRequiredProviders(config)
    const requiredKeys = Array.from(providers).map(p => getProviderKeyName(p))
    console.log(`[${context}] Workflow requires providers:`, Array.from(providers))
    console.log(`[${context}] Required API keys:`, requiredKeys)
    return { providers, models }
  } catch (error) {
    logException(error, {
      location: "/lib/workflow/provider-validation",
    })
    console.error(`[${context}] Failed to extract providers:`, error)
    return { providers: new Set(FALLBACK_PROVIDER_IDS), models: new Map() }
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
  return missingKeys.map(p => getProviderDisplayName(p))
}
