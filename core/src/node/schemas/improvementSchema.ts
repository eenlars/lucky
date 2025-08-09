import { memoryInstructions } from "@core/node/schemas/memoryInstructions.p"
import { MemorySchemaOptional } from "@core/node/schemas/memorySchema"
import {
  ACTIVE_CODE_TOOL_NAMES,
  ACTIVE_MCP_TOOL_NAMES,
} from "@core/tools/tool.types"
import { llmify } from "@core/utils/common/llmify"
import {
  ACTIVE_MODEL_NAMES,
  ACTIVE_MODEL_NAMES_WITH_INFO,
} from "@core/utils/spending/pricing"
import { z, ZodRawShape } from "zod"

// define the raw shape
export const baseWorkflowNodeConfigShape = {
  nodeId: z.string(),
  description: z.string(),
  modelName: z.enum(ACTIVE_MODEL_NAMES as unknown as [string, ...string[]]),
  mcpTools: z.array(
    z.enum(ACTIVE_MCP_TOOL_NAMES as unknown as [string, ...string[]])
  ),
  codeTools: z.array(
    z.enum(ACTIVE_CODE_TOOL_NAMES as unknown as [string, ...string[]])
  ),
  systemPrompt: z.string(),
  handOffs: z.array(z.string()),
  handOffType: z.enum(["conditional", "sequential", "parallel"]).optional(),
  memory: MemorySchemaOptional,
} as const satisfies ZodRawShape

const systemPromptExplanation = llmify(`
<purpose>
- focused on WHAT the node does. it should include the goal of the node, and what it's trying to achieve

<purpose:if-tool-usage-enabled>
- focused on HOW to use tools. 
- if more tools: say how to use them in what order
</purpose:if-tool-usage-enabled>
</purpose>

<format>
- raw string, no formatting
</format>

<limitations>
- maximum 200 characters
</limitations>
`)

export const AGENT_KEY_EXPLANATIONS = {
  nodeId:
    "Unique identifier for the workflow node — this may never change (needs to be a descriptive string like 'sensor-user'",
  description:
    "High-level description of what this workflow node does (short, 1-2 sentences). this is different from the system prompt.",
  systemPrompt: systemPromptExplanation,
  memory: `Memory storage for workflow node insights: ${memoryInstructions}`,
  modelName: `Model enum (${ACTIVE_MODEL_NAMES_WITH_INFO})`,
  handOffs: "Permitted hand-off workflow node IDs",
  handOffType:
    "Optional handoff strategy for this node: 'sequential' (default), 'parallel' (fan-out to all handOffs), or 'conditional' (model decides one).",
}
