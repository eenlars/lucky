"use server"
import { MissingApiKeysError } from "@/features/secret-management/lib/errors/general"
import { PROVIDERS, PROVIDER_API_KEYS } from "@lucky/models"
import type { SecretResolver } from "@lucky/shared/contracts/ingestion"
import type { LuckyProvider } from "@lucky/shared/contracts/llm-contracts/providers"
import { isNir } from "@repo/shared"

export type UserProviders = Record<LuckyProvider, string>

/**
 * Load API keys for all available providers.
 *
 * Fetches provider API keys from secrets and returns only providers with valid keys.
 * Uses the PROVIDERS catalog to validate provider names - only returns known providers.
 *
 * @param secrets - Secret resolver for fetching API keys
 * @returns Map of provider IDs to API key values (only providers with actual keys)
 *
 * @example
 * const apiKeys = await loadProviderApiKeys(secrets)
 * // Returns: { openai: "sk-...", groq: "gsk_..." }
 * // Note: Only includes providers that have actual API keys configured
 */
export async function loadProviderApiKeys(secrets: SecretResolver): Promise<Record<LuckyProvider, string>> {
  const keys = await secrets.getAll([...PROVIDER_API_KEYS], "environment-variables")

  // if keys is empty, return an error.
  if (isNir(keys)) {
    throw new MissingApiKeysError(
      [...PROVIDER_API_KEYS],
      PROVIDERS.map(p => p.displayName),
    )
  }

  // Build entries for all providers from the catalog
  const entries: [LuckyProvider, string][] = []

  for (const provider of PROVIDERS) {
    const apiKey = keys[provider.secretKeyName]
    if (apiKey && apiKey.trim().length > 0) {
      entries.push([provider.provider, apiKey])
    }
  }

  return Object.fromEntries(entries) as Record<LuckyProvider, string>
}
