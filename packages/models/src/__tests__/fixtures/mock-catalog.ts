/**
 * Mock catalog fixture for testing
 *
 * IMPORTANT: This fixture is strongly typed to prevent divergence from reality.
 * All models must conform to the ModelEntry type, ensuring tests stay valid
 * even when the real catalog changes.
 *
 * Benefits:
 * - TypeScript enforces correct structure at compile time
 * - Tests won't break when providers add/remove/rename models
 * - Fixture stays stable and predictable for deterministic testing
 *
 * Maintenance:
 * - Keep this fixture representative of real catalog structure
 * - Update model IDs if they become truly obsolete
 * - Ensure coverage of all 3 providers (OpenAI, Groq, OpenRouter)
 */

import type { ModelEntry } from "@lucky/shared"

/**
 * Mock OpenAI models for testing
 */
export const MOCK_OPENAI_MODELS: ModelEntry[] = [
  {
    id: "openai#gpt-4o-mini",
    provider: "openai",
    model: "gpt-4o-mini",
    input: 0.15,
    output: 0.6,
    cachedInput: null,
    contextLength: 128000,
    intelligence: 8,
    speed: "fast",
    pricingTier: "low",
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
    runtimeEnabled: true,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
  },
  {
    id: "openai#gpt-3.5-turbo",
    provider: "openai",
    model: "gpt-3.5-turbo",
    input: 0.5,
    output: 1.5,
    cachedInput: null,
    contextLength: 16385,
    intelligence: 6,
    speed: "fast",
    pricingTier: "low",
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    runtimeEnabled: true,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
  },
  {
    id: "openai#gpt-4o",
    provider: "openai",
    model: "gpt-4o",
    input: 2.5,
    output: 10.0,
    cachedInput: null,
    contextLength: 128000,
    intelligence: 9,
    speed: "medium",
    pricingTier: "medium",
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
    runtimeEnabled: true,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
  },
]

/**
 * Mock Groq models for testing
 */
export const MOCK_GROQ_MODELS: ModelEntry[] = [
  {
    id: "groq#llama-3.3-70b-versatile",
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    input: 0.59,
    output: 0.79,
    cachedInput: null,
    contextLength: 32768,
    intelligence: 7,
    speed: "fast",
    pricingTier: "low",
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    runtimeEnabled: true,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
  },
  {
    id: "groq#llama-3.1-8b-instant",
    provider: "groq",
    model: "llama-3.1-8b-instant",
    input: 0.05,
    output: 0.08,
    cachedInput: null,
    contextLength: 131072,
    intelligence: 5,
    speed: "fast",
    pricingTier: "low",
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    runtimeEnabled: true,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
  },
]

/**
 * Mock OpenRouter models for testing
 */
export const MOCK_OPENROUTER_MODELS: ModelEntry[] = [
  {
    id: "openrouter#meta-llama/llama-3.1-8b-instruct:free",
    provider: "openrouter",
    model: "meta-llama/llama-3.1-8b-instruct:free",
    input: 0,
    output: 0,
    cachedInput: null,
    contextLength: 131072,
    intelligence: 5,
    speed: "fast",
    pricingTier: "low",
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    runtimeEnabled: true,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
  },
  {
    id: "openrouter#anthropic/claude-3.5-sonnet",
    provider: "openrouter",
    model: "anthropic/claude-3.5-sonnet",
    input: 3.0,
    output: 15.0,
    cachedInput: null,
    contextLength: 200000,
    intelligence: 9,
    speed: "medium",
    pricingTier: "high",
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
    runtimeEnabled: true,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
  },
]

/**
 * Complete mock catalog for testing
 * Stable fixture that won't change when live catalog updates
 */
export const MOCK_CATALOG: ModelEntry[] = [...MOCK_OPENAI_MODELS, ...MOCK_GROQ_MODELS, ...MOCK_OPENROUTER_MODELS]
