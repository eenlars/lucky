import type { UserGateways } from "@/features/provider-llm-setup/lib/load-user-providers"
import { getServerLLMRegistry } from "@/features/provider-llm-setup/llm-registry"
import type { ModelEntry, UserModels } from "@lucky/models"
import type { LuckyGateway, Principal } from "@lucky/shared"

export async function createLLMRegistryForUser({
  principal,
  userProviders,
  userEnabledModels,
}: {
  principal: Principal
  userProviders: UserGateways
  userEnabledModels: ModelEntry[]
  fallbackKeys?: Partial<Record<string, string>>
}): Promise<UserModels> {
  const llmRegistry = await getServerLLMRegistry()
  const apiKeys: Partial<Record<LuckyGateway, string>> = {
    "openai-api": userProviders["openai-api"],
    "groq-api": userProviders["groq-api"],
    "openrouter-api": userProviders["openrouter-api"],
    // todo add anthropic once ready.
  }

  const userModels = llmRegistry.forUser({
    mode: "byok",
    userId: principal.clerk_id,
    models: userEnabledModels.map(m => m.gatewayModelId),
    apiKeys: apiKeys,
  })

  return userModels
}
