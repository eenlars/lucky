/**
 * Authentication and User Context Types
 *
 * Types for threading user identity and API key resolution through
 * the workflow execution stack.
 */

import type { LuckyProvider } from "@lucky/shared"

/**
 * API Key Resolver Interface
 *
 * Provides methods for resolving provider-specific API keys and
 * validating model access for a specific user.
 *
 * Implementations should:
 * - Fetch encrypted API keys from lockbox.user_secrets
 * - Decrypt keys using LOCKBOX_KEK
 * - Check provider settings from lockbox.provider_settings
 * - Cache results per-invocation for performance
 */
export interface ApiKeyResolver {
  /**
   * Get the API key for a specific provider.
   * @param provider - Provider identifier (openai, openrouter, groq)
   * @returns Decrypted API key or null if not configured
   */
  getProviderApiKey(provider: LuckyProvider): Promise<string | null>

  /**
   * Get list of models the user has enabled for a provider.
   * @param provider - Provider identifier
   * @returns Array of enabled model names
   */
  getEnabledModelsForProvider(provider: LuckyProvider): Promise<string[]>

  /**
   * Check if user has access to a specific model.
   * @param modelName - Full model name to validate
   * @returns True if model is enabled for this user
   */
  validateModelAccess(modelName: string): Promise<boolean>

  /**
   * Get all providers that the user has configured.
   * @returns Array of configured provider identifiers
   */
  getAllConfiguredProviders(): Promise<LuckyProvider[]>
}

/**
 * User Execution Context
 *
 * Contains user identity and API key resolution capabilities.
 * Threaded through the entire workflow execution stack to enable
 * user-scoped API key resolution at runtime.
 *
 * Usage:
 * - Created at API route level with user's clerk_id
 * - Passed to invokeWorkflow()
 * - Threaded through Workflow → Node → Model Factory → Provider Client
 * - Used by provider clients to resolve API keys just-in-time
 */
export interface UserExecutionContext {
  /**
   * Clerk user ID for the authenticated user.
   * Used for database queries and audit logging.
   */
  clerkId: string

  /**
   * API key resolver instance with user-specific context.
   * Provides methods to fetch and decrypt API keys from lockbox.
   */
  apiKeyResolver: ApiKeyResolver
}
