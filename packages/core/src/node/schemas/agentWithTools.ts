import { getCoreConfig } from "@core/core-config/coreConfig"
import { AGENT_KEY_EXPLANATIONS, baseWorkflowNodeConfigShape } from "@core/node/schemas/improvementSchema"
import { withDescriptions } from "@lucky/shared"
import { ACTIVE_CODE_TOOL_NAMES, ACTIVE_MCP_TOOL_NAMES } from "@lucky/tools/client"
import type { z } from "zod"

// dynamically generate tool descriptions from active tools only
const mcpToolsList = ACTIVE_MCP_TOOL_NAMES.join(", ")
const codeToolsList = ACTIVE_CODE_TOOL_NAMES.join(", ")

// descriptions for workflow improvement
export const agentDescriptionsWithTools = {
  nodeId: AGENT_KEY_EXPLANATIONS.nodeId,
  description: AGENT_KEY_EXPLANATIONS.description,
  gatewayModelId: AGENT_KEY_EXPLANATIONS.gatewayModelId,
  mcpTools: `MCP external tools (${mcpToolsList}). MAX ${getCoreConfig().tools.maxToolsPerAgent} tools`,
  codeTools: `Code internal tools (${codeToolsList}). MAX ${getCoreConfig().tools.maxToolsPerAgent} tools`,
  handOffs: AGENT_KEY_EXPLANATIONS.handOffs,
  handOffType: AGENT_KEY_EXPLANATIONS.handOffType,
  waitFor: AGENT_KEY_EXPLANATIONS.waitFor,
  memory: AGENT_KEY_EXPLANATIONS.memory,
  systemPrompt: AGENT_KEY_EXPLANATIONS.systemPrompt,
} as const

export const AgentDescriptionsWithToolsSchema = withDescriptions(
  baseWorkflowNodeConfigShape,
  agentDescriptionsWithTools,
)
export type AgentDescriptionsWithToolsZod = z.infer<typeof AgentDescriptionsWithToolsSchema>
