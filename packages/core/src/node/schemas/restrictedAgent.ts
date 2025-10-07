import { AGENT_KEY_EXPLANATIONS } from "@core/node/schemas/improvementSchema"
import { MemorySchemaOptional } from "@core/utils/memory/memorySchema"
import { ACTIVE_MODEL_NAMES } from "@core/utils/spending/pricing"
import { withDescriptions } from "@lucky/shared"
import { type ZodRawShape, z } from "zod"

// define a restricted shape for improvement output (excluding tools and handoffs) ———
const restrictedNodeConfigShape = {
  description: z.string(),
  modelName: z.enum(ACTIVE_MODEL_NAMES as unknown as [string, ...string[]]),
  memory: MemorySchemaOptional,
} as const satisfies ZodRawShape

// build restricted schema for improvement output ———
const restrictedAgentDescriptions = {
  nodeId: AGENT_KEY_EXPLANATIONS.nodeId,
  description: AGENT_KEY_EXPLANATIONS.description,
  modelName: AGENT_KEY_EXPLANATIONS.modelName,
  memory: AGENT_KEY_EXPLANATIONS.memory,
  handOffs: AGENT_KEY_EXPLANATIONS.handOffs,
} as const

export const RestrictedAgentDescriptionsConfigSchema = withDescriptions(
  restrictedNodeConfigShape,
  restrictedAgentDescriptions,
)

export type RestrictedAgentDescriptionsZod = z.infer<typeof RestrictedAgentDescriptionsConfigSchema>

export const AgentSelfImprovementOutputSchema = z.object({
  improve_points: z.string().describe("Points to improve the workflow node (short, 1-2 sentences)"),
  learn_points: z.string().describe("Points to learn from the workflow node (short, 1-2 sentences)"),
  updated_node_config: RestrictedAgentDescriptionsConfigSchema,
})

export type AgentSelfImprovementOutputZod = z.infer<typeof AgentSelfImprovementOutputSchema>
