/**
 * Model Wrapper with Feature Flag Support
 *
 * Provides gradual migration from legacy model factory to models registry.
 * Supports feature flags for controlled rollout with instant rollback capability.
 * Includes automatic tier resolution for configured models.
 */

import type { LanguageModel } from "ai"
import { models } from "./models-instance"
import { getLanguageModel } from "@core/messages/api/modelFactory"
import type { ModelName } from "@core/utils/spending/models.types"
import { tierResolver } from "./tier-resolver"

interface ModelRequest {
  model: string
  userId?: string
  experiment?: string
}

/**
 * Feature flag configuration for models registry rollout
 */
const MODELS_CONFIG = {
  // Set to true to enable models registry globally
  enabled: false,

  // Rollout percentage (0-100)
  rolloutPercent: 0,

  // Specific test users to always use models registry
  testUsers: new Set<string>([
    "researcher-1",
    "test-user",
    // Add more test users here
  ]),
} as const

/**
 * Simple hash function for deterministic user-based rollout
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Determine if models registry should be used for this request
 */
function shouldUseModels(userId?: string): boolean {
  // Global disable
  if (!MODELS_CONFIG.enabled) return false

  // No userId = no models registry (fallback to legacy)
  if (!userId) return false

  // Test users always get models registry
  if (MODELS_CONFIG.testUsers.has(userId)) return true

  // Gradual rollout based on userId hash
  const hash = simpleHash(userId)
  const rolloutPercent = MODELS_CONFIG.rolloutPercent

  return hash % 100 < rolloutPercent
}

/**
 * Get model using models registry or legacy system
 *
 * This is the new public API that supports gradual migration.
 * Includes automatic tier resolution - if you request a model that's
 * configured as a tier model (e.g., "openai/gpt-4.1-mini" is the "medium" tier),
 * it will automatically use "tier:medium" for better abstraction.
 *
 * @example
 * // Direct provider/model
 * const model = await getModel({ model: 'openrouter/gpt-4.1-mini' })
 *
 * @example
 * // Tier-based selection (recommended)
 * const model = await getModel({ model: 'tier:fast' })
 *
 * @example
 * // Auto-tier resolution: if gpt-4.1-mini is configured as "medium" tier,
 * // this automatically resolves to tier:medium
 * const model = await getModel({ model: 'openai/gpt-4.1-mini' })
 *
 * @example
 * // User-specific config
 * const model = await getModel({
 *   model: 'user:john:experiment1',
 *   userId: 'john'
 * })
 */
export async function getModel(request: ModelRequest): Promise<LanguageModel> {
  // Use models registry if enabled for this user
  if (shouldUseModels(request.userId)) {
    // Auto-resolve model to tier if it matches a tier's configured model
    const resolvedSpec = tierResolver.resolveModelSpec(request.model)

    const model = await models.model(resolvedSpec, {
      userId: request.userId,
      experiment: request.experiment,
      requestId: crypto.randomUUID(),
    })
    // Safe cast: LanguageModelV1 is a valid LanguageModel in AI SDK v5+
    return model as unknown as LanguageModel
  }

  // Fallback to legacy system
  // Convert models registry format to legacy format if needed
  const modelName = extractLegacyModelName(request.model)
  return getLanguageModel(modelName)
}

/**
 * Extract legacy ModelName from models registry model string
 *
 * @example
 * extractLegacyModelName('openrouter/gpt-4.1-mini') => 'openai/gpt-4.1-mini'
 * extractLegacyModelName('tier:fast') => 'openai/gpt-4.1-mini' (default)
 */
function extractLegacyModelName(modelSpec: string): ModelName {
  // If it's a tier or user config, use default model
  if (modelSpec.startsWith("tier:") || modelSpec.startsWith("user:")) {
    return "openai/gpt-4.1-mini" as ModelName
  }

  // If it's provider/model format, extract the model part
  if (modelSpec.includes("/")) {
    const [_provider, ...modelParts] = modelSpec.split("/")
    return modelParts.join("/") as ModelName
  }

  // Return as-is
  return modelSpec as ModelName
}

/**
 * Get model with reasoning support (maintains backward compatibility)
 */
export async function getModelWithReasoning(
  request: ModelRequest & { reasoning?: boolean }
): Promise<LanguageModel> {
  // For now, models registry doesn't special-case reasoning
  // We'll add this support later if needed
  return getModel(request)
}

/**
 * Enable models registry globally (for testing/debugging)
 */
export function enableModels(): void {
  ;(MODELS_CONFIG as any).enabled = true
}

/**
 * Disable models registry globally (instant rollback)
 */
export function disableModels(): void {
  ;(MODELS_CONFIG as any).enabled = false
}

/**
 * Set rollout percentage (0-100)
 */
export function setRolloutPercent(percent: number): void {
  if (percent < 0 || percent > 100) {
    throw new Error("Rollout percent must be between 0 and 100")
  }
  ;(MODELS_CONFIG as any).rolloutPercent = percent
}

/**
 * Add a test user to always use models registry
 */
export function addTestUser(userId: string): void {
  ;(MODELS_CONFIG as any).testUsers.add(userId)
}

/**
 * Check current models registry configuration
 */
export function getModelsConfig() {
  return {
    enabled: MODELS_CONFIG.enabled,
    rolloutPercent: MODELS_CONFIG.rolloutPercent,
    testUsers: Array.from(MODELS_CONFIG.testUsers),
  }
}