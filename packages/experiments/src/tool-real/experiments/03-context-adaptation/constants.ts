import type { OpenRouterModelName } from "@lucky/core/utils/spending/models.types"
import { experimentalModels } from "@lucky/examples/settings/models"

export const VAGUE_SYSTEM_PROMPT = "You are a helpful assistant with tools. Use them to complete the user's request."

export const CLEAR_SYSTEM_PROMPT =
  "You are a helpful assistant with tools. Note: fetch_objects has a limit of 3 items per call. If you need more than 3 items, split across multiple calls and then combine_results."

export interface TestScenario {
  id: string
  prompt: string
  expected: number
}

export const TEST_SCENARIOS: TestScenario[] = [
  {
    id: "basic-failure",
    prompt: "Please fetch 5 objects with the query 'item' and return the combined results.",
    expected: 5,
  },
  {
    id: "larger-request",
    prompt: "I need 8 objects with the query 'product'. Please get them and combine the results.",
    expected: 8,
  },
  {
    id: "within-limit",
    prompt: "Can you fetch 2 objects with the query 'sample' for me?",
    expected: 2,
  },
]

export const WITHIN_LIMIT_SCENARIO_ID = "within-limit"

export const MODELS: OpenRouterModelName[] = [
  // experimentalModels.gpt5.id,
  experimentalModels.gpt4oMini.id,
  experimentalModels.gpt4o.id,
  experimentalModels.mistral.id,
  experimentalModels.gpt35turbo.id,
  experimentalModels.claude35haiku.id,
  // experimentalModels.gemini25pro.id,
  experimentalModels.geminiLite.id,
  experimentalModels.llama318bInstruct.id,
]

// Curated subset for faster our-algorithm runs (chosen for comparative value vs. baseline)
export const MODELS_OUR_ALGORITHM: OpenRouterModelName[] = [
  experimentalModels.gpt35turbo.id,
  experimentalModels.claude35haiku.id,
  // experimentalModels.gemini25pro.id,
  experimentalModels.geminiLite.id,
]
