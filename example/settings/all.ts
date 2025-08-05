import type { FlowSettings } from "../../packages/core/src/utils/config/runtimeConfig.types"
import { CONFIG, PATHS } from "./constants"
import { EVOLUTION_CONFIG } from "./evolution"
import { QUESTIONS, SELECTED_QUESTION } from "./inputs"
// import { LoggingTypes } from "./logging" // File deleted
import { MODEL_CONFIG } from "./models"
import { TOOLS, TOOL_CONFIG, TOOL_IMPROVEMENT_CONFIG } from "./tools"

export type { FlowSettings }

export const SETTINGS: FlowSettings = {
  config: CONFIG,
  paths: PATHS,
  modelSettings: MODEL_CONFIG,
  tools: {
    definitions: TOOLS,
    config: TOOL_CONFIG,
    improvement: TOOL_IMPROVEMENT_CONFIG,
  },
  // logging: LoggingTypes, // File deleted
  evolution: EVOLUTION_CONFIG,
  inputs: {
    questions: QUESTIONS,
    selected: SELECTED_QUESTION,
  },
}
