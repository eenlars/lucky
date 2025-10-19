import type { Principal } from "@/lib/auth/principal"
import type { InvocationInput } from "@lucky/core/workflow/runner/types"
import { createLLMRegistry } from "@lucky/models"
import type { UserModels } from "@lucky/models"
import type { SecretResolver } from "@lucky/shared/contracts/ingestion"
import { loadWorkflowConfigFromInput } from "./config-loader"
import { MissingApiKeysError, NoEnabledModelsError } from "./errors"
import { validateInvocationInputSchema } from "./input-schema-validation"
import { type ResolvedModels, getAllAvailableModels, resolveAvailableModels } from "./model-resolver"
import {
  FALLBACK_PROVIDER_KEYS,
  formatMissingProviders,
  getRequiredProviderKeys,
  validateProviderKeys,
} from "./provider-validation"
import { fetchUserProviderSettings } from "./user-provider-settings"

/**
 * Result of loading providers and models
 */
export type ProviderModelResult = {
  /** API keys for required providers */
  apiKeys: Record<string, string>
  /** User models instance ready for execution */
  userModels: UserModels
  /** Available providers (post-filtering) */
  providers: Set<string>
  /** Available models per provider (post-filtering/fallback) */
  models: Map<string, string[]>
  /** Information about fallbacks used */
  resolved: ResolvedModels
}

/**
 * Load and resolve providers and models for workflow execution.
 *
 * Complete flow:
 * 1. Load workflow config from input
 * 2. Validate input data against workflow's input schema
 * 3. Extract required providers/models from config
 * 4. Fetch user's enabled models from database
 * 5. Resolve available models (filter + fallback logic)
 * 6. Fetch API keys for required providers
 * 7. Validate API keys are present
 * 8. Create LLM registry and user models
 *
 * @param input - Workflow invocation input
 * @param principal - Authenticated principal
 * @param secrets - Secret resolver for API keys
 * @returns Provider/model configuration ready for execution
 * @throws {SchemaValidationError} When input data validation fails
 * @throws {MissingApiKeysError} When required API keys are missing (session auth only)
 * @throws {NoEnabledModelsError} When a required provider has no enabled models
 *
 * @example
 * const result = await loadProvidersAndModels(input, principal, secrets)
 * // Use result.userModels in execution context
 * // Use result.apiKeys for execution context
 */
export async function loadProvidersAndModels(
  input: InvocationInput,
  principal: Principal,
  secrets: SecretResolver,
): Promise<ProviderModelResult> {
  // 1. Load workflow config
  const { config: workflowConfig } = await loadWorkflowConfigFromInput(input)

  // 2. Validate input against schema (if mcp-invoke type and schema defined)
  validateInvocationInputSchema(input, workflowConfig)

  // 3. Extract required providers/models from workflow config
  const { providers: requiredProviders, models: requiredModels } = workflowConfig
    ? getRequiredProviderKeys(workflowConfig, "provider-model-loader")
    : { providers: new Set(FALLBACK_PROVIDER_KEYS), models: new Map() }

  // 3. Fetch user's enabled models from database
  const enabledModels = await fetchUserProviderSettings(principal.clerk_id, principal)

  // 4. Resolve available models (filter + fallback)
  let resolved: ResolvedModels

  if (requiredModels.size > 0) {
    // Workflow specifies models - resolve with fallback
    resolved = resolveAvailableModels(requiredModels, enabledModels)
  } else {
    // No specific models required - use all enabled models
    resolved = getAllAvailableModels(enabledModels)
  }

  // Check if any providers are available
  if (resolved.providers.size === 0) {
    throw new NoEnabledModelsError("all")
  }

  // 5. Fetch API keys for required providers
  const apiKeys = await secrets.getAll(Array.from(requiredProviders), "environment-variables")

  // 6. Validate API keys (session auth only)
  if (principal.auth_method === "session") {
    const missingKeys = validateProviderKeys(Array.from(requiredProviders), apiKeys)

    if (missingKeys.length > 0) {
      const missingProviders = formatMissingProviders(missingKeys)
      throw new MissingApiKeysError(missingKeys, missingProviders)
    }
  }

  // 7. Create LLM registry and user models
  const llmRegistry = createLLMRegistry({
    fallbackKeys: {
      openai: apiKeys.OPENAI_API_KEY,
      groq: apiKeys.GROQ_API_KEY,
      openrouter: apiKeys.OPENROUTER_API_KEY,
    },
  })

  const userModels = llmRegistry.forUser({
    mode: "byok",
    userId: principal.clerk_id,
    models: Array.from(resolved.models.values()).flat(),
    apiKeys: {
      openai: apiKeys.OPENAI_API_KEY,
      groq: apiKeys.GROQ_API_KEY,
      openrouter: apiKeys.OPENROUTER_API_KEY,
    },
  })

  // Log fallback information
  if (resolved.fallbacksUsed.size > 0) {
    console.log("[provider-model-loader] Fallbacks used:")
    for (const [provider, { requested, used }] of resolved.fallbacksUsed.entries()) {
      console.log(`  ${provider}: requested ${requested.join(", ")} → using ${used.join(", ")}`)
    }
  }

  return {
    apiKeys,
    userModels,
    providers: resolved.providers,
    models: resolved.models,
    resolved,
  }
}

// Re-export error types
export { MissingApiKeysError, NoEnabledModelsError }
