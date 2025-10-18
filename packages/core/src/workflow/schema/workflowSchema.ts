import { z } from "zod"

import { agentDescriptionsWithTools } from "@core/node/schemas/agentWithTools"
import { MemorySchemaOptional } from "@core/utils/memory/memorySchema"

import type { WorkflowConfig, WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"
import { findModelById, findModelByName } from "@lucky/models"
import { tierNameSchema, withDescriptions, type TierName } from "@lucky/shared"
import { ACTIVE_CODE_TOOL_NAMES_WITH_DEFAULT, ACTIVE_MCP_TOOL_NAMES } from "@lucky/tools/client"

// ============================================================================
// MAIN WORKFLOW SCHEMAS
// ============================================================================

export const WorkflowNodeConfigSchema = z.object({
  nodeId: z.string(),
  description: z.string(),
  systemPrompt: z.string(),
  // accept any model string - validation happens at runtime via userModels.model() or userModels.tier()
  modelName: z.string().refine(name => typeof name === "string" && name.length > 0, {
    message: "Model name must be a non-empty string",
  }),
  mcpTools: z.array(z.enum(ACTIVE_MCP_TOOL_NAMES)),
  codeTools: z.array(z.enum(ACTIVE_CODE_TOOL_NAMES_WITH_DEFAULT)),
  handOffs: z.array(z.string()),
  handOffType: z.enum(["conditional", "sequential", "parallel"]).optional(),
  // enable async joins by allowing nodes to specify required predecessors
  waitFor: z.array(z.string()).optional(),
  memory: MemorySchemaOptional,
})

export const WorkflowConfigSchema = z.object({
  __schema_version: z.number().optional(),
  nodes: z.array(WorkflowNodeConfigSchema),
  entryNodeId: z.string(),
  contextFile: z.string().nullish(),
  memory: MemorySchemaOptional,
})

// ============================================================================
// DISPLAY SCHEMAS (for legacy workflow loading)
// ============================================================================

// display-only schema that allows any model name for legacy workflows
// validates and falls back to a default tier if model unavailable
export const WorkflowNodeConfigSchemaDisplay = z.object({
  nodeId: z.string(),
  description: z.string(),
  systemPrompt: z.string(),
  modelName: z.string().transform(modelName => {
    // try to find the model in the catalog (by catalog ID or API name)
    const catalogEntry = findModelById(modelName) || findModelByName(modelName)

    if (catalogEntry) {
      // model exists, use its catalog ID
      return catalogEntry.id
    }

    // model not found - fallback to cheap tier (most compatible)
    console.warn(`Model "${modelName}" not found in catalog, falling back to tier: cheap`)
    return "cheap"
  }),
  mcpTools: z.array(z.string()), // allow any string for legacy tools
  codeTools: z.array(z.string()), // allow any string for legacy tools
  handOffs: z.array(z.string()),
  handOffType: z.enum(["conditional", "sequential", "parallel"]).optional(),
  waitFor: z.array(z.string()).optional(),
  memory: MemorySchemaOptional,
})

export const WorkflowConfigSchemaDisplay = z.object({
  __schema_version: z.number().optional(),
  nodes: z.array(WorkflowNodeConfigSchemaDisplay),
  entryNodeId: z.string(),
  contextFile: z.string().nullish(),
  memory: MemorySchemaOptional,
})

// ============================================================================
// EASY SCHEMAS (for AI-driven workflow generation)
// ============================================================================

export const WorkflowNodeConfigSchemaEasy = z.object({
  nodeId: z.string(),
  description: z.string(),
  systemPrompt: z.string(),
  // accept tier names ("cheap", "fast", "smart", "balanced") or full model IDs
  // the AI should prefer tier names for simplicity; mapping to actual models happens later
  modelName: z.string(),
  mcpTools: z.array(z.enum(ACTIVE_MCP_TOOL_NAMES)),
  codeTools: z.array(z.enum(ACTIVE_CODE_TOOL_NAMES_WITH_DEFAULT)),
  handOffs: z.array(z.string()),
  handOffType: z.enum(["conditional", "sequential", "parallel"]).optional(),
  // expose waitFor in the easy schema so the generator can produce async joins
  waitFor: z.array(z.string()).optional(),
})

// guide the AI to use tier names instead of provider model IDs
const agentDescriptionsWithToolsEasy = {
  ...agentDescriptionsWithTools,
  modelName:
    "Model tier for this node. Must be exactly one of: 'cheap' | 'fast' | 'smart' | 'balanced'. Choose based on task complexity. cheap=simple tasks, fast=quick responses, smart=complex reasoning, balanced=general purpose. Do NOT output provider model IDs here; mapping to actual models happens later.",
} as const

export const WorkflowConfigSchemaEasy = z.object({
  __schema_version: z.number().optional(),
  nodes: z.array(withDescriptions(WorkflowNodeConfigSchemaEasy.shape, agentDescriptionsWithToolsEasy)),
  entryNodeId: z.string(),
})

// ============================================================================
// WORKFLOW COMPLETION HANDLERS
// ============================================================================

/**
 * Handle workflow completion with tier-based model selection.
 * Maps tier names to actual models using the user's configured models.
 *
 * This strategy:
 * 1. Accepts tier names ("cheap", "fast", "smart", "balanced") from AI
 * 2. Preserves full model IDs if already present
 * 3. Merges with old workflow node data if available
 * 4. Returns a complete WorkflowConfig ready for execution
 */
export const handleWorkflowCompletionTierStrategy = (
  oldWorkflow: WorkflowConfig | null,
  newWorkflow: z.infer<typeof WorkflowConfigSchemaEasy>,
): WorkflowConfig => {
  const handledNodes: WorkflowNodeConfig[] = (newWorkflow.nodes ?? []).map(partialNode => {
    const oldNode = oldWorkflow?.nodes?.find(n => n.nodeId === partialNode.nodeId)

    // validate model name - either a valid tier or an existing model
    let validatedModelName = partialNode.modelName
    const modelNameLower = partialNode.modelName?.toLowerCase()

    // check if it's a tier name
    const validTiers = tierNameSchema.options
    const isTier = validTiers.includes(modelNameLower as TierName)

    if (isTier) {
      // normalize tier name to lowercase
      validatedModelName = modelNameLower
    } else {
      // not a tier - validate it's a real model
      const catalogEntry = findModelById(partialNode.modelName) || findModelByName(partialNode.modelName)
      if (catalogEntry) {
        validatedModelName = catalogEntry.id
      } else {
        // model not found - fallback to cheap tier for safety
        console.warn(`Model "${partialNode.modelName}" not found in catalog, falling back to tier: cheap`)
        validatedModelName = "cheap"
      }
    }

    const fullNode = { ...partialNode, modelName: validatedModelName }

    return oldNode ? { ...oldNode, ...fullNode } : fullNode
  })

  return {
    ...newWorkflow,
    nodes: handledNodes,
  }
}

/**
 * Handle workflow completion with user-models strategy.
 * Validates model names are either valid tiers or actual models.
 */
export const handleWorkflowCompletionUserModelsStrategy = (
  oldWorkflow: WorkflowConfig | null,
  newWorkflow: z.infer<typeof WorkflowConfigSchemaEasy>,
): WorkflowConfig => {
  const validTiers = tierNameSchema.options

  const validatedNodes = newWorkflow.nodes.map(partialNode => {
    const oldNode = oldWorkflow?.nodes?.find(n => n.nodeId === partialNode.nodeId)

    // validate model name
    let validatedModelName = partialNode.modelName
    const modelNameLower = partialNode.modelName?.toLowerCase()

    // check if it's a valid tier
    const isTier = validTiers.includes(modelNameLower as TierName)

    if (isTier) {
      // normalize tier name to lowercase
      validatedModelName = modelNameLower
    } else {
      // validate it's a real model
      const catalogEntry = findModelById(partialNode.modelName) || findModelByName(partialNode.modelName)
      if (catalogEntry) {
        validatedModelName = catalogEntry.id
      } else {
        console.warn(`Model "${partialNode.modelName}" not found, falling back to tier: cheap`)
        validatedModelName = "cheap"
      }
    }

    const fullNode = { ...partialNode, modelName: validatedModelName }
    return oldNode ? { ...oldNode, ...fullNode } : fullNode
  })

  return {
    ...newWorkflow,
    nodes: validatedNodes,
  }
}
