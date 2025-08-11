import {
  AGENT_KEY_EXPLANATIONS,
  baseWorkflowNodeConfigShape,
} from "@core/node/schemas/improvementSchema"
import {
  ACTIVE_CODE_TOOL_NAMES,
  ACTIVE_MCP_TOOL_NAMES,
} from "@core/tools/tool.types"
import { withDescriptions } from "@core/utils/zod/withDescriptions"
import { CONFIG } from "@runtime/settings/constants.client"
import type { z } from "zod"

// dynamically generate tool descriptions from active tools only
const mcpToolsList = ACTIVE_MCP_TOOL_NAMES.join(", ")
const codeToolsList = ACTIVE_CODE_TOOL_NAMES.join(", ")

// descriptions for workflow improvement
export const agentDescriptionsWithTools = {
  nodeId: AGENT_KEY_EXPLANATIONS.nodeId,
  description: AGENT_KEY_EXPLANATIONS.description,
  modelName: AGENT_KEY_EXPLANATIONS.modelName,
  mcpTools: `MCP external tools (${mcpToolsList}). MAX ${CONFIG.tools.maxToolsPerAgent} tools`,
  codeTools: `Code internal tools (${codeToolsList}). MAX ${CONFIG.tools.maxToolsPerAgent} tools`,
  handOffs: AGENT_KEY_EXPLANATIONS.handOffs,
  handOffType: AGENT_KEY_EXPLANATIONS.handOffType,
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
