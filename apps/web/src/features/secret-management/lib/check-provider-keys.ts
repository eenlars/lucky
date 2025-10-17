/**
 * Check if API keys are configured in lockbox for given providers
 * Does NOT validate keys with provider APIs (that would be slow)
 * Just checks if the key exists and is non-empty
 */

import { getProviderKeyName } from "@lucky/core/workflow/provider-extraction"
import { createSecretResolver } from "./secretResolver"

export type ProviderKeyStatus = {
  provider: string
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
export async function checkProviderKeyStatus(clerkId: string, provider: string): Promise<ProviderKeyStatus> {
  const resolver = createSecretResolver(clerkId)
  const keyName = getProviderKeyName(provider)

  try {
    const key = await resolver.get(keyName)
    return {
      provider,
      keyConfigured: Boolean(key && key.trim().length > 0),
      keyName,
      lastChecked: new Date().toISOString(),
    }
  } catch {
    return {
      provider,
      keyConfigured: false,
      keyName,
      lastChecked: new Date().toISOString(),
    }
  }
}

/**
 * Check multiple providers' API keys in parallel
 * @param clerkId User's Clerk ID
 * @param providers Array of provider names
 * @returns Map of provider name to key status
 */
export async function checkMultipleProviderKeys(clerkId: string, providers: string[]): Promise<Map<string, boolean>> {
  const statuses = await Promise.all(providers.map(provider => checkProviderKeyStatus(clerkId, provider)))

  const statusMap = new Map<string, boolean>()
  for (const status of statuses) {
    statusMap.set(status.provider, status.keyConfigured)
  }
  return statusMap
}
