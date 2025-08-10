/**
 * openaiRunner.ts - Helper to run tool-calling chats and expose a unified tool set
 * Exports:
 *  - allToolSpecs: ordered tool registry used by the capacity experiment
 *  - chatWithTools: thin wrapper over sendAI(mode:"tool") that returns a RunTrace-like shape
 */

import { processResponseVercel } from "@core/messages/api/processResponse"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import type { AgentStep } from "@core/messages/pipeline/AgentStep.types"
import type { CoreMessage, Tool, ToolSet } from "ai"

// Basic tools
import { spec as alwaysErrorSpec } from "../../shared/tools/alwaysError"
import { spec as alwaysRightSpec } from "../../shared/tools/alwaysRight"
import { spec as alwaysWrongSpec } from "../../shared/tools/alwaysWrong"
import { spec as confusingButRightSpec } from "../../shared/tools/confusingButRight"

// Richer, more realistic tools (used by new prompts)
import { adaptiveTools } from "../../shared/tools/adaptive/adaptiveTools"
import { spec as catchFishSpec } from "../../shared/tools/catchFish"
import { spec as catchSalmonSpec } from "../../shared/tools/catchSalmon"
import { spec as catchSalmonHardSpec } from "../../shared/tools/catchSalmonHard"
import { documentChainTools } from "../../shared/tools/sequential-chains/documentChain"
import { locationChainTools } from "../../shared/tools/sequential-chains/locationChain"

// Filler/noise tools
import { noopSpecs } from "../../shared/tools/noops"

// Build ordered entries to control which 4 "real" tools are always present at low tool-counts
const orderedEntries: ReadonlyArray<readonly [string, Tool]> = [
  // Always-available, diverse real tools (1-4)
  ["always_right", alwaysRightSpec],
  ["confusing_but_right", confusingButRightSpec],
  ["output_formatter", documentChainTools.output_formatter],
  ["location_data_info", locationChainTools.location_data_info],
  ["catch_fish", catchFishSpec],
  ["catch_salmon", catchSalmonSpec],
  ["unclear_getter", catchSalmonHardSpec],

  // Additional realistic tools (beyond the first 4) = 11
  ["always_wrong", alwaysWrongSpec],
  ["always_error", alwaysErrorSpec],
  ["input_validator", documentChainTools.input_validator],
  ["metadata_extractor", documentChainTools.metadata_extractor],
  ["content_classifier", documentChainTools.content_classifier],
  ["workflow_router", documentChainTools.workflow_router],
  ["search_google_maps", locationChainTools.search_google_maps],
  ["location_data_manager", locationChainTools.location_data_manager],
  ["verify_location", locationChainTools.verify_location],
  ["fetch_objects", adaptiveTools.fetch_objects],
  ["combine_results", adaptiveTools.combine_results],
  // Then append noop_N fillers to reach large tool-count conditions
  ...noopSpecs.map((spec, i) => [`noop_${i}`, spec] as const),
]

export const allToolSpecs: Record<string, Tool> = Object.fromEntries(
  orderedEntries as ReadonlyArray<[string, Tool]>
) as Record<string, Tool>

export type ToolCallTrace = {
  toolName: string
  args: unknown
  result: string
}

export type RunTrace = {
  messages: CoreMessage[]
  toolCalls: ToolCallTrace[]
  usdCost?: number
}

/**
 * Execute a single chat turn with tools and normalize the output into RunTrace
 */
export async function chatWithTools(
  model: import("@core/utils/spending/models.types").ModelName,
  userContent: string,
  tools: ToolSet
): Promise<RunTrace> {
  const messages: CoreMessage[] = [{ role: "user", content: userContent }]

  const response = await sendAI({
    mode: "tool",
    messages,
    model,
    opts: {
      tools,
      maxSteps: 1,
      toolChoice: "required",
      saveOutputs: false,
    },
  })

  if (!response.success) {
    throw new Error(response.error || "Unknown error from sendAI")
  }

  const data = response.data
  const usdCost = response.success ? response.usdCost : undefined

  // Use the shared response processor to normalize tool executions
  const processed = processResponseVercel({
    response: data,
    modelUsed: model,
    nodeId: "capacity-experiment",
  })

  const outputs: ReadonlyArray<AgentStep> = processed.agentSteps ?? []
  const toolCalls: ToolCallTrace[] = outputs
    .filter((o) => o.type === "tool")
    .map((o) => ({
      toolName: o.name ?? "",
      args: o.args ?? {},
      result:
        typeof o.return === "string" ? o.return : JSON.stringify(o.return),
    }))

  return { messages, toolCalls, usdCost }
}
