import { logException } from "@/lib/error-logger"
import {
  type RequiredProviders,
  extractRequiredProviders,
  getProviderDisplayName,
  getProviderKeyName,
} from "@lucky/core/workflow/provider-extraction"
import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import { PROVIDERS, PROVIDER_API_KEYS } from "@lucky/models"

// Re-export for backward compatibility
export { PROVIDER_API_KEYS }

const FALLBACK_PROVIDERS = [
  ...new Set([
    ...PROVIDERS.map(entry => entry.provider),
    "anthropic", // legacy support not yet in PROVIDERS catalog
  ]),
]

/**
 * Extract required provider API keys from workflow config
 * Returns fallback keys if extraction fails
 */
export function getRequiredProviderKeys(config: WorkflowConfig, context: string): RequiredProviders {
  try {
    const { providers, models } = extractRequiredProviders(config)
    const requiredKeys = Array.from(providers).map(getProviderKeyName)
    console.log(`[${context}] Workflow requires providers:`, Array.from(providers))
    console.log(`[${context}] Required API keys:`, requiredKeys)
    return { providers, models }
  } catch (error) {
    logException(error, {
      location: "/features/workflow-invocation/lib/provider-validation",
    })
    console.error(`[${context}] Failed to extract providers:`, error)
    return { providers: new Set(FALLBACK_PROVIDERS), models: new Map() }
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
