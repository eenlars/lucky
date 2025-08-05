/**
 * Model definitions and configuration
 */

import type {
  ModelConfig,
  ModelRuntimeConfig,
} from "@core/utils/config/runtimeConfig.types"

export const MODELS: ModelConfig = {
  nano: "google/gemini-2.5-flash-lite",
  low: "google/gemini-2.5-flash-lite",
  medium: "google/gemini-2.5-pro-preview",
  high: "anthropic/claude-sonnet-4",
  default: "google/gemini-2.5-flash-lite",
  fitness: "google/gemini-2.5-flash-lite",
  reasoning: "anthropic/claude-sonnet-4",
  summary: "google/gemini-2.5-flash-lite",
  fallback: "switchpoint/router",
} as const

export const MODEL_CONFIG: ModelRuntimeConfig = {
  provider: "openai" as const,
  inactive: new Set<string>(),
  models: MODELS,
}

// Re-export for compatibility
export { MODELS as default }
