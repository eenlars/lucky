import {
  AGENT_KEY_EXPLANATIONS,
  baseWorkflowNodeConfigShape,
} from "@node/schemas/improvementSchema"
import { withDescriptions } from "@utils/zod/withDescriptions"
import {
  ACTIVE_CODE_TOOL_NAMES,
  ACTIVE_MCP_TOOL_NAMES,
} from "@tools/tool.types"
import { getSettings } from "@utils/config/runtimeConfig"
import type { z } from "zod"

// dynamically generate tool descriptions from active tools only
const mcpToolsList = ACTIVE_MCP_TOOL_NAMES.join(", ")
const codeToolsList = ACTIVE_CODE_TOOL_NAMES.join(", ")

// descriptions for workflow improvement
export const agentDescriptionsWithTools = {
  nodeId: AGENT_KEY_EXPLANATIONS.nodeId,
  description: AGENT_KEY_EXPLANATIONS.description,
  modelName: AGENT_KEY_EXPLANATIONS.modelName,
  mcpTools: `MCP external tools (${mcpToolsList}). MAX ${getSettings().tools.maxToolsPerAgent} tools`,
  codeTools: `Code internal tools (${codeToolsList}). MAX ${getSettings().tools.maxToolsPerAgent} tools`,
  handOffs: AGENT_KEY_EXPLANATIONS.handOffs,
  memory: AGENT_KEY_EXPLANATIONS.memory,
  systemPrompt: AGENT_KEY_EXPLANATIONS.systemPrompt,
} as const

export const AgentDescriptionsWithToolsSchema = withDescriptions(
  baseWorkflowNodeConfigShape,
  agentDescriptionsWithTools
)
export type AgentDescriptionsWithToolsZod = z.infer<
  typeof AgentDescriptionsWithToolsSchema
>
