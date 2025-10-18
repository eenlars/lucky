import { getDefaultModels } from "@core/core-config/coreConfig"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { createWorkflowPrompt } from "@core/prompts/createWorkflow"
import { toolsExplanations } from "@core/prompts/explainTools"
import { WORKFLOW_GENERATION_RULES } from "@core/prompts/generationRules"
import { llmify, truncater } from "@core/utils/common/llmify"
import { validateAndRepairWorkflow } from "@core/utils/validation/validateWorkflow"
import type {
  AfterGenerationOptions,
  GenerationOptions,
  ModelSelectionStrategy,
} from "@core/workflow/actions/generate/generateWF.types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import {
  WorkflowConfigSchemaEasy,
  handleWorkflowCompletionTierStrategy,
  handleWorkflowCompletionUserModelsStrategy,
} from "@core/workflow/schema/workflowSchema"
import { sanitizeConfigTools } from "@core/workflow/utils/sanitizeTools"
import { mapModelNameToEasyName, normalizeModelName } from "@lucky/models"
import { R, type RS, withDescriptions } from "@lucky/shared"
import { ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION } from "@lucky/tools"

/**
 * MODEL NAME FLOW IN FORMALIZEWORKFLOW
 * =====================================
 *
 * This function handles a 3-step transformation of model names to enable AI workflow generation
 * while preserving user's explicit model choices:
 *
 * STEP 1: SIMPLIFICATION (Before AI generation)
 * - Input: Complex model names like "openrouter#openai/gpt-4", "anthropic#claude-opus"
 * - Transform: mapModelNameToEasyName() converts to simple tier names ("cheap", "fast", "smart", "balanced")
 * - Purpose: AI works with simple tier vocabulary instead of complex provider#model strings
 * - Location: Line 49-54 (normalizedConfigNodes)
 *
 * STEP 2: AI GENERATION
 * - AI receives workflow with simplified tier names
 * - AI returns new/modified workflow with tier names or specific model choices
 *
 * STEP 3: RESTORATION (After AI generation)
 * - For nodes that existed in the old workflow: RESTORE original model name
 *   Example: Node "analyzer" had "openrouter#openai/gpt-4" → preserve this exact choice
 * - For new nodes: Keep AI's choice (validated tier name or model ID)
 *   Example: New node "summarizer" with "cheap" → keep "cheap" for execution-time resolution
 *
 * EDGE CASE (TODO):
 * - If a NEW node has tier "cheap", should resolve to best available model for user
 * - If user has no models, fallback to default
 * - Currently marked as TODO - complex resolution logic needed
 *
 * This ensures users' explicit model selections are preserved across workflow iterations
 * while allowing AI to work with a simplified model vocabulary.
 */

// generate a single workflow from scratch based on a prompt
export async function formalizeWorkflow(
  prompt: string, // try not to input a full workflow here. the aim is to give an instruction to change a workflow.
  options: GenerationOptions & AfterGenerationOptions,
): Promise<RS<WorkflowConfig>> {
  const promptPreview = truncater(prompt, 160)
  const baseWorkflowStats = options.workflowConfig
    ? {
        nodeCount: options.workflowConfig.nodes.length,
        entryNodeId: options.workflowConfig.entryNodeId,
      }
    : null

  const requestContext = {
    promptPreview,
    verifyWorkflow: options.verifyWorkflow ?? "default",
    hasBaseWorkflow: Boolean(options.workflowConfig),
    baseWorkflowStats,
    workflowGoalPreview: options.workflowGoal ? truncater(options.workflowGoal, 120) : null,
  }
  console.log("[formalizeWorkflow] start", requestContext)
  // Sanitize base workflow for the prompt to avoid advertising inactive tools
  const baseSanitized = options.workflowConfig ? sanitizeConfigTools(options.workflowConfig) : undefined

  const normalizedConfigNodes = baseSanitized?.nodes.map(node => {
    return {
      ...node,
      modelName: mapModelNameToEasyName(node.modelName),
    }
  })

  const systemPrompt = `You are an expert workflow designer. Generate 1 workflow configuration based on the user's requirements.

The workflow should:
1. Have a clear, specific description of its purpose
2. Include an appropriate system prompt for the AI agent
3. Select the right model for the task complexity
4. Choose relevant tools from the available options

${
  baseSanitized
    ? `
BASE WORKFLOW:
${JSON.stringify(
  {
    ...baseSanitized,
    nodes: normalizedConfigNodes,
  },
  null,
  2,
)}

IMPROVEMENT GOAL: ${options.workflowGoal}

# createWorkflowPrompt:
${createWorkflowPrompt}
`
    : `
# createWorkflowPrompt:
${createWorkflowPrompt}
`
}

Available code tools: ${toolsExplanations("code")}
Available MCP tools: ${Object.keys(ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION).join(", ")}
${WORKFLOW_GENERATION_RULES}
`
  const userPrompt = `
Create 1 workflow configuration for: ${prompt}
`

  const sendAIStart = Date.now()
  const response = await sendAI({
    messages: [
      { role: "system", content: llmify(systemPrompt) },
      { role: "user", content: llmify(userPrompt) },
    ],
    model: getDefaultModels().balanced,
    mode: "structured",
    schema: withDescriptions(WorkflowConfigSchemaEasy.shape, {
      __schema_version: "Schema version for migration (optional, defaults to 1)",
      nodes: "The nodes in the workflow",
      entryNodeId: "The entry node ID",
    }),
  })
  const sendAIDurationMs = Date.now() - sendAIStart
  console.log("[formalizeWorkflow] sendAI completed", {
    success: response.success,
    durationMs: sendAIDurationMs,
    usdCost: response.usdCost ?? 0,
    model: getDefaultModels().balanced,
  })

  if (!response.success) {
    // Provide helpful context for model-related errors
    const requestedModel = getDefaultModels().balanced
    console.error("[formalizeWorkflow] sendAI error", {
      error: response.error,
      durationMs: sendAIDurationMs,
      model: requestedModel,
    })
    return R.error(
      `Failed to generate workflow in formalizeWorkflow (model: ${requestedModel}). Error: ${response.error}`,
      response.usdCost || 0,
    )
  }

  const workflowConfig = response.data
  const modelStrategy: ModelSelectionStrategy = options.modelSelectionStrategy ?? { strategy: "tier" }
  let handledWorkflow: WorkflowConfig
  if (modelStrategy.strategy === "tier") {
    handledWorkflow = handleWorkflowCompletionTierStrategy(options.workflowConfig ?? null, workflowConfig)
  } else {
    handledWorkflow = handleWorkflowCompletionUserModelsStrategy(options.workflowConfig ?? null, workflowConfig)
  }

  // STEP 3: Restore original model names for existing nodes (see MODEL NAME FLOW comment above)
  handledWorkflow = restoreOriginalModelNames(options.workflowConfig ?? null, handledWorkflow)

  // defensively sanitize any inactive/unknown tools that may have crept in
  const sanitizedHandledWorkflow = sanitizeConfigTools(handledWorkflow)
  const normalizedWorkflow = normalizeWorkflowModels(sanitizedHandledWorkflow, modelStrategy)

  // For immediate UI feedback, skip verification by default unless explicitly requested
  if (options.verifyWorkflow === "none" || !options.verifyWorkflow) {
    console.log("[formalizeWorkflow] verification skipped", {
      verifyWorkflow: options.verifyWorkflow ?? "none",
    })
    return {
      success: true,
      data: normalizedWorkflow,
      usdCost: response.usdCost,
    }
  }

  let repairOptions: { maxRetries?: number; onFail?: "throw" | "returnNull" }
  if (options.verifyWorkflow === "strict") {
    repairOptions = { maxRetries: 0, onFail: "throw" }
  } else {
    // "normal"
    repairOptions = { maxRetries: 1, onFail: "returnNull" }
  }

  console.log("[formalizeWorkflow] running validateAndRepairWorkflow", {
    verifyWorkflow: options.verifyWorkflow,
    repairOptions,
  })
  const verificationStart = Date.now()
  const { finalConfig, cost } = await validateAndRepairWorkflow(normalizedWorkflow, repairOptions)
  const verificationDurationMs = Date.now() - verificationStart

  if (finalConfig === null) {
    console.warn("[formalizeWorkflow] validation failed to produce config", {
      verificationDurationMs,
      additionalCost: cost,
    })
    return R.error("Failed to enhance workflow, no final config", response.usdCost + cost)
  }

  console.log("[formalizeWorkflow] completed successfully", {
    totalDurationMs: Date.now() - sendAIStart,
    verificationDurationMs,
    usdCost: (response.usdCost ?? 0) + cost,
    nodeCount: finalConfig.nodes.length,
  })

  const normalizedFinalConfig = normalizeWorkflowModels(finalConfig, modelStrategy)

  return R.success(normalizedFinalConfig, response.usdCost + cost)
}

/**
 * Restore original model names for nodes that existed in the old workflow.
 * This preserves user's explicit model choices while allowing AI to work with simplified tier names.
 *
 * @param oldWorkflow - Original workflow before AI modification (null if generating from scratch)
 * @param newWorkflow - Workflow returned by AI with simplified model names
 * @returns Workflow with original model names restored for existing nodes
 */
function restoreOriginalModelNames(oldWorkflow: WorkflowConfig | null, newWorkflow: WorkflowConfig): WorkflowConfig {
  if (!oldWorkflow) return newWorkflow

  const nodes = newWorkflow.nodes.map(node => {
    const oldNode = oldWorkflow.nodes.find(n => n.nodeId === node.nodeId)

    if (oldNode) {
      // Node existed in old workflow - restore its original model name
      // This preserves user's explicit model choice (e.g., "openrouter#openai/gpt-4")
      return { ...node, modelName: oldNode.modelName }
    }

    // New node - keep AI's choice (tier name like "cheap" or specific model ID)
    // TODO: If modelName is a tier like "cheap", resolve to best available model for user
    // This requires access to user's model configuration and fallback logic
    return node
  })

  return {
    ...newWorkflow,
    nodes,
  }
}

function normalizeWorkflowModels(
  config: WorkflowConfig,
  _modelSelectionStrategy: ModelSelectionStrategy,
): WorkflowConfig {
  const nodes = config.nodes.map(node => {
    if (!node.modelName) return node

    const normalizedModelName = normalizeModelName(node.modelName)

    // If normalization changed the name, update the node
    if (normalizedModelName !== node.modelName) {
      return { ...node, modelName: normalizedModelName }
    }

    return node
  })

  return {
    ...config,
    nodes,
  }
}
