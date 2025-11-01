"use server"
import type { LLMRegistry } from "@lucky/models"
import { GATEWAYS, createLLMRegistry } from "@lucky/models"
import type { LuckyGateway } from "@lucky/shared"

let registryInstance: LLMRegistry | undefined

export async function getServerLLMRegistry(): Promise<LLMRegistry> {
  if (!registryInstance) {
    registryInstance = createLLMRegistry({ fallbackKeys })
  }
  return registryInstance
}

export async function __internalResetLLMRegistry(): Promise<void> {
  registryInstance = undefined
}

const fallbackKeys = GATEWAYS.reduce<Partial<Record<LuckyGateway, string>>>(
  (acc: Partial<Record<LuckyGateway, string>>, provider) => {
    const key = process.env[provider.secretKeyName]
    if (typeof key === "string" && key.length > 0 && key.startsWith(provider.apiKeyValuePrefix)) {
      acc[provider.gateway] = key
    }
    return acc
  },
  {},
) as Record<LuckyGateway, string>
