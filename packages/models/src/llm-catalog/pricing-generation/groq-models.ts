import type { ModelEntry } from "@lucky/shared"

export const GROQ_MODELS: ModelEntry[] = [
  // ============================================================================
  // Groq API
  // ============================================================================

  {
    gateway: "groq-api",
    gatewayModelId: "openai/gpt-oss-20b",
    input: 0.5,
    output: 0.8,
    cachedInput: 0.1,
    contextLength: 131072,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "fast",
    intelligence: 7,
    pricingTier: "low",
    runtimeEnabled: true,
    uiHiddenInProd: true,
  },

  {
    gateway: "groq-api",
    gatewayModelId: "gpt-oss-120b",
    input: 0.15,
    output: 0.75,
    cachedInput: 0.015,
    contextLength: 131072,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "fast",
    intelligence: 9,
    pricingTier: "low",
    runtimeEnabled: true,
    uiHiddenInProd: true,
  },
]
