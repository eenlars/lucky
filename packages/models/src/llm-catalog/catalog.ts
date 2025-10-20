/**
 * Simplified Model Catalog
 * Single source of truth for model definitions and pricing
 */

import type { ModelEntry } from "@lucky/shared"
import { GROQ_MODELS } from "./pricing-generation/groq-models"
import { OPENAI_MODELS } from "./pricing-generation/openai-models"
import { OPENROUTER_MODELS } from "./pricing-generation/openrouter-models"

/**
 * Model catalog - single source of truth for all available models
 */
export const MODEL_CATALOG: ModelEntry[] = [...OPENAI_MODELS, ...GROQ_MODELS, ...OPENROUTER_MODELS]
