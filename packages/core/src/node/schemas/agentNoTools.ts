import { AGENT_KEY_EXPLANATIONS, baseWorkflowNodeConfigShape } from "@core/node/schemas/improvementSchema"
import { withDescriptions } from "@lucky/shared"
import type { z } from "zod"

// descriptions for single node
const agentDescriptions = {
  nodeId: AGENT_KEY_EXPLANATIONS.nodeId,
  description: AGENT_KEY_EXPLANATIONS.description,
  modelName: AGENT_KEY_EXPLANATIONS.modelName,
  mcpTools: "MCP tools available to this workflow node (NOT ALLOWED TO EDIT)",
  codeTools: "Code tools available to this workflow node (NOT ALLOWED TO EDIT)",
  handOffs: "Which other workflow nodes this node is allowed to hand off to (NOT ALLOWED TO EDIT)",
  systemPrompt: AGENT_KEY_EXPLANATIONS.systemPrompt,
  handOffType: AGENT_KEY_EXPLANATIONS.handOffType,
  memory: AGENT_KEY_EXPLANATIONS.memory,
} as const

// build two separate schemas (same TS type!) ———
export const AgentDescriptionsNoToolsConfigSchema = withDescriptions(baseWorkflowNodeConfigShape, agentDescriptions)

// the inferred TS type is the same for both:
export type AgentDescriptionsNoToolsConfigZod = z.infer<typeof AgentDescriptionsNoToolsConfigSchema>
