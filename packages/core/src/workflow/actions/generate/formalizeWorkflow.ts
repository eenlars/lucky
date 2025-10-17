import { getDefaultModels } from "@core/core-config/coreConfig"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { createWorkflowPrompt } from "@core/prompts/createWorkflow"
import { mapModelNameToEasyName } from "@core/prompts/explainAgents"
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
import { tryNormalizeModelType } from "@lucky/models"
import type { ModelEntry, ModelPricingTier } from "@lucky/shared"
import { R, type RS, withDescriptions } from "@lucky/shared"
import { ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION } from "@lucky/tools"

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
    model: getDefaultModels().medium,
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
    model: getDefaultModels().medium,
  })

  if (!response.success) {
    // Provide helpful context for model-related errors
    const requestedModel = getDefaultModels().medium
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

function normalizeWorkflowModels(
  config: WorkflowConfig,
  modelSelectionStrategy: ModelSelectionStrategy,
): WorkflowConfig {
  let changed = false

  const nodes = config.nodes.map(node => {
    if (!node.modelName) return node

    // If strategy is user-models and node uses a pricing tier keyword, map to user's available models
    const modelNameLower = node.modelName.toLowerCase()
    if (
      modelSelectionStrategy.strategy === "user-models" &&
      Array.isArray(modelSelectionStrategy.models) &&
      modelSelectionStrategy.models.length > 0 &&
      (modelNameLower === "low" || modelNameLower === "medium" || modelNameLower === "high")
    ) {
      const resolved = pickUserModelForTier(modelNameLower as ModelPricingTier, modelSelectionStrategy.models)
      if (resolved && resolved !== node.modelName) {
        changed = true
        return { ...node, modelName: resolved }
      }
    }

    // Otherwise, try to normalize the model type
    const normalized = tryNormalizeModelType(node.modelName)
    if (!normalized || normalized === node.modelName) {
      return node
    }

    changed = true
    return { ...node, modelName: normalized }
  })

  if (!changed) {
    return config
  }

  return {
    ...config,
    nodes,
  }
}

// Limit user models to top 5 candidates (defensive against large model lists)
// Ranking by: intelligence * speed_score
function getLimitedUserModels(models: ModelEntry[], limit = 5): ModelEntry[] {
  if (models.length <= limit) {
    return models
  }

  const rank = (m: ModelEntry) => {
    const speedScore = m.speed === "fast" ? 3 : m.speed === "medium" ? 2 : 1
    return m.intelligence * 10 + speedScore
  }

  const sorted = models.slice().sort((a, b) => rank(b) - rank(a))
  const limited = sorted.slice(0, limit)

  console.log(`[formalizeWorkflow] limited user models from ${models.length} to ${limited.length}`, {
    originalCount: models.length,
    limitedCount: limited.length,
    topModels: limited.map(m => ({ model: m.model, intelligence: m.intelligence, speed: m.speed })),
  })

  return limited
}

// Select a concrete model from the user's allowed models for a given pricing tier.
// Policy: prefer highest intelligence within the tier; if none, fall back to best overall.
function pickUserModelForTier(tier: ModelPricingTier, models: ModelEntry[]): string {
  // Limit to top 5 models (defensive against large model lists)
  const limitedModels = getLimitedUserModels(models)

  const byTier = limitedModels.filter(m => m.pricingTier === tier && m.runtimeEnabled)

  const rank = (m: ModelEntry) => {
    // Higher intelligence preferred; speed order: fast > medium > slow
    const speedScore = m.speed === "fast" ? 3 : m.speed === "medium" ? 2 : 1
    return m.intelligence * 10 + speedScore
  }

  const pick = (arr: ModelEntry[]) => arr.slice().sort((a, b) => rank(b) - rank(a))[0]

  const preferred = pick(byTier)
  if (preferred) return preferred.model // API-facing model string

  // Fallback to best overall from limited user's models
  const any = pick(limitedModels.filter(m => m.runtimeEnabled))
  if (any) return any.model

  // Final fallback to core defaults (keeps system robust if user list is empty)
  return getDefaultModels().default
}
