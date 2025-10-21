"use server"
import { MissingApiKeysError } from "@/features/secret-management/lib/errors/general"
import { GATEWAYS, GATEWAY_API_KEYS } from "@lucky/models"
import { isNir } from "@lucky/shared"
import type { SecretResolver } from "@lucky/shared/contracts/ingestion"
import type { LuckyGateway } from "@lucky/shared/contracts/llm-contracts/providers"

export type UserGateways = Partial<Record<LuckyGateway, string>>

/**
 * Load API keys for all configured gateways from user secrets.
 * Only returns gateways that have valid, non-empty API keys.
 */
export async function loadProviderApiKeys(secrets: SecretResolver): Promise<UserGateways> {
  const keys = await secrets.getAll([...GATEWAY_API_KEYS], "environment-variables")

  if (isNir(keys)) {
    throw new MissingApiKeysError(
      [...GATEWAY_API_KEYS],
      GATEWAYS.map(g => g.displayName),
    )
  }

  const entries: [LuckyGateway, string][] = []
  for (const gateway of GATEWAYS) {
    const apiKey = keys[gateway.secretKeyName]
    if (apiKey && apiKey.trim().length > 0) {
      entries.push([gateway.gateway, apiKey])
    }
  }

  return Object.fromEntries(entries)
}
