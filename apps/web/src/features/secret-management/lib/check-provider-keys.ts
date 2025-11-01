/**
 * Check if API keys are configured in lockbox for given gateways
 * Does NOT validate keys with gateway APIs (that would be slow)
 * Just checks if the key exists and is non-empty
 */

import { getProviderKeyName } from "@lucky/core/workflow/provider-extraction"
import type { LuckyGateway } from "@lucky/shared"
import { createSecretResolver } from "./secretResolver"

export type ProviderKeyStatus = {
  gateway: LuckyGateway
  keyConfigured: boolean
  keyName: string
  lastChecked: string
}

/**
 * Check if a provider's API key is configured in the lockbox
 * @param clerkId User's Clerk ID
 * @param provider Provider name (e.g., "openai", "anthropic")
 * @returns Status indicating if key is configured
 */
export async function checkProviderKeyStatus(clerkId: string, gateway: LuckyGateway): Promise<ProviderKeyStatus> {
  const resolver = createSecretResolver(clerkId)
  const keyName = getProviderKeyName(gateway.replace(/-api$/, ""))

  try {
    const key = await resolver.get(keyName)
    return {
      gateway,
      keyConfigured: Boolean(key && key.trim().length > 0),
      keyName,
      lastChecked: new Date().toISOString(),
    }
  } catch {
    return {
      gateway,
      keyConfigured: false,
      keyName,
      lastChecked: new Date().toISOString(),
    }
  }
}

/**
 * Check multiple gateways' API keys in parallel
 * @param clerkId User's Clerk ID
 * @param gateways Array of gateways
 * @returns Map of gateway to key status
 */
export async function checkMultipleProviderKeys(
  clerkId: string,
  gateways: LuckyGateway[],
): Promise<Map<LuckyGateway, boolean>> {
  const statuses = await Promise.all(gateways.map(gateway => checkProviderKeyStatus(clerkId, gateway)))

  const statusMap = new Map<LuckyGateway, boolean>()
  for (const status of statuses) {
    statusMap.set(status.gateway, status.keyConfigured)
  }
  return statusMap
}
