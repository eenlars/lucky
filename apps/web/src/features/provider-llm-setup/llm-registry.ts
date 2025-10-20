"use server"
import type { LLMRegistry } from "@lucky/models"
import { PROVIDERS, createLLMRegistry } from "@lucky/models"
import type { LuckyProvider } from "@repo/shared"

let registryInstance: LLMRegistry | undefined

export function getServerLLMRegistry(): LLMRegistry {
  if (!registryInstance) {
    registryInstance = createLLMRegistry({ fallbackKeys })
  }
  return registryInstance
}

export function __internalResetLLMRegistry(): void {
  registryInstance = undefined
}

const fallbackKeys = PROVIDERS.reduce<Partial<Record<LuckyProvider, string>>>((acc, provider) => {
  const key = process.env[provider.secretKeyName]
  if (typeof key === "string" && key.length > 0 && key.startsWith(provider.apiKeyValuePrefix)) {
    acc[provider.provider] = key
  }
  return acc
}, {}) as Record<LuckyProvider, string>
