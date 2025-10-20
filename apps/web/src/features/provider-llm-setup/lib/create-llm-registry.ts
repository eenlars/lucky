import type { UserProviders } from "@/features/provider-llm-setup/lib/load-user-providers"
import { type ModelEntry, type UserModels, createLLMRegistry } from "@lucky/models"
import type { LuckyProvider, Principal } from "@repo/shared"

export async function createLLMRegistryForUser({
  principal,
  userProviders,
  userEnabledModels,
  fallbackKeys,
}: {
  principal: Principal
  userProviders: UserProviders
  userEnabledModels: ModelEntry[]
  fallbackKeys?: Record<string, string>
}): Promise<UserModels> {
  const llmRegistry = createLLMRegistry({ fallbackKeys: fallbackKeys ? fallbackKeys : {} })

  const apiKeys: Record<LuckyProvider, string> = {
    openai: userProviders.openai,
    groq: userProviders.groq,
    openrouter: userProviders.openrouter,
    // todo add anthropic once ready.
  }

  const userModels = llmRegistry.forUser({
    mode: "byok",
    userId: principal.clerk_id,
    models: userEnabledModels.map(m => m.id),
    apiKeys: apiKeys,
  })

  return userModels
}
