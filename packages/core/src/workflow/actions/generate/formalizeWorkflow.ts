import { sendAI } from "@/messages/api/sendAI"
import { createWorkflowPrompt } from "@/prompts/createWorkflow"
import { toolsExplanations } from "@/prompts/explainTools"
import { WORKFLOW_GENERATION_RULES } from "@/prompts/generationRules"
import { llmify } from "@/utils/common/llmify"
import { R, type RS } from "@/utils/types"
import { validateAndRepairWorkflow } from "@/utils/validation/validateWorkflow"
import { withDescriptions } from "@/utils/zod/withDescriptions"
import type {
  AfterGenerationOptions,
  GenerationOptions,
} from "@/workflow/actions/generate/generateWF.types"
import { MODELS } from "@/runtime/settings/constants"
import type { WorkflowConfig } from "@workflow/schema/workflow.types"
import {
  handleWorkflowCompletion,
  WorkflowConfigSchemaEasy,
} from "@workflow/schema/workflowSchema"

// generate a single workflow from scratch based on a prompt
export async function formalizeWorkflow(
  prompt: string,
  options: GenerationOptions & AfterGenerationOptions
): Promise<RS<WorkflowConfig>> {
  const normalizedConfigNodes = options.workflowConfig?.nodes.map((node) => {
    return {
      ...node,
      modelName:
        node.modelName === MODELS.medium
          ? "medium"
          : node.modelName === MODELS.high
            ? "high"
            : "low",
    }
  })

  const systemPrompt = `You are an expert workflow designer. Generate 1 workflow configuration based on the user's requirements.

The workflow should:
1. Have a clear, specific description of its purpose
2. Include an appropriate system prompt for the AI agent
3. Select the right model for the task complexity
4. Choose relevant tools from the available options

${
  options.workflowConfig
    ? `
BASE WORKFLOW:
${JSON.stringify(
  {
    ...options.workflowConfig,
    nodes: normalizedConfigNodes,
  },
  null,
  2
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
Available MCP tools: (currently empty array)
${WORKFLOW_GENERATION_RULES}
`
  const userPrompt = `
Create 1 workflow configuration for: ${prompt}
`

  const response = await sendAI({
    messages: [
      { role: "system", content: llmify(systemPrompt) },
      { role: "user", content: llmify(userPrompt) },
    ],
    model: MODELS.medium,
    mode: "structured",
    schema: withDescriptions(WorkflowConfigSchemaEasy.shape, {
      nodes: "The nodes in the workflow",
      entryNodeId: "The entry node ID",
    }),
  })

  if (!response.success) {
    return R.error(
      `Failed to generate workflow in formalizeWorkflow. error: ${response.error}`,
      response.usdCost || 0
    )
  }

  const workflowConfig = response.data
  const handledWorkflow = handleWorkflowCompletion(
    options.workflowConfig ?? null,
    workflowConfig
  )

  // For immediate UI feedback, skip verification by default unless explicitly requested
  if (options.verifyWorkflow === "none" || !options.verifyWorkflow) {
    return {
      success: true,
      data: handledWorkflow,
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

  const { finalConfig, cost } = await validateAndRepairWorkflow(
    handledWorkflow,
    repairOptions
  )

  if (finalConfig === null) {
    return R.error(
      "Failed to enhance workflow, no final config",
      response.usdCost + cost
    )
  }

  return R.success(finalConfig, response.usdCost + cost)
}
