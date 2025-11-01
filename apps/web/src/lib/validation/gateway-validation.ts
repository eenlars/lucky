import { logException } from "@/lib/error-logger"
import {
  type RequiredGateways,
  extractRequiredGateways,
  getProviderDisplayName,
  getProviderKeyName,
} from "@lucky/core/workflow/provider-extraction"
import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import { GATEWAYS, GATEWAY_API_KEYS } from "@lucky/models"

export { GATEWAY_API_KEYS }

const FALLBACK_GATEWAYS = new Set(GATEWAYS.map(entry => entry.gateway))

/**
 * Extract required gateways from workflow config.
 * Falls back to all known gateways if extraction fails.
 */
export function getRequiredGateways(config: WorkflowConfig, context: string): RequiredGateways {
  try {
    const { gateways, models } = extractRequiredGateways(config)
    const requiredKeys = Array.from(gateways).map(getProviderKeyName)
    console.log(`[${context}] Workflow requires gateways:`, Array.from(gateways))
    console.log(`[${context}] Required API keys:`, requiredKeys)
    return { gateways, models }
  } catch (error) {
    logException(error, {
      location: "/lib/validation/gateway-validation",
    })
    console.error(`[${context}] Failed to extract gateways:`, error)
    return { gateways: FALLBACK_GATEWAYS, models: new Map() }
  }
}

/**
 * Check which required gateways are missing API keys.
 * Returns gateway names (e.g., "openai-api") not API key names.
 */
export function validateGatewayKeys(
  requiredGateways: readonly string[],
  gatewayKeys: Partial<Record<string, string>>,
): string[] {
  return requiredGateways.filter(gateway => !gatewayKeys[gateway])
}

/**
 * Convert API key names to user-friendly display names.
 * E.g., "OPENAI_API_KEY" → "OpenAI"
 */
export function formatGatewayDisplayNames(apiKeyNames: string[]): string[] {
  return apiKeyNames.map(getProviderDisplayName)
}
