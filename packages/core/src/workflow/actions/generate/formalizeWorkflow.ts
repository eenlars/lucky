import { getDefaultModels } from "@core/core-config/compat"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { createWorkflowPrompt } from "@core/prompts/createWorkflow"
import { mapModelNameToEasyName } from "@core/prompts/explainAgents"
import { toolsExplanations } from "@core/prompts/explainTools"
import { WORKFLOW_GENERATION_RULES } from "@core/prompts/generationRules"
import { llmify } from "@core/utils/common/llmify"
import { validateAndRepairWorkflow } from "@core/utils/validation/validateWorkflow"
import { withDescriptions } from "@core/utils/zod/withDescriptions"
import type { AfterGenerationOptions, GenerationOptions } from "@core/workflow/actions/generate/generateWF.types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { WorkflowConfigSchemaEasy, handleWorkflowCompletion } from "@core/workflow/schema/workflowSchema"
import { sanitizeConfigTools } from "@core/workflow/utils/sanitizeTools"
import { R, type RS } from "@lucky/shared"
import { ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION } from "@lucky/tools"

// generate a single workflow from scratch based on a prompt
export async function formalizeWorkflow(
  prompt: string, // try not to input a full workflow here. the aim is to give an instruction to change a workflow.
  options: GenerationOptions & AfterGenerationOptions,
): Promise<RS<WorkflowConfig>> {
  console.log("formalizeWorkflow", prompt, JSON.stringify(options, null, 2))
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

  const response = await sendAI({
    messages: [
      { role: "system", content: llmify(systemPrompt) },
      { role: "user", content: llmify(userPrompt) },
    ],
    model: getDefaultModels().medium,
    mode: "structured",
    schema: withDescriptions(WorkflowConfigSchemaEasy.shape, {
      nodes: "The nodes in the workflow",
      entryNodeId: "The entry node ID",
    }),
  })

  if (!response.success) {
    return R.error(`Failed to generate workflow in formalizeWorkflow. error: ${response.error}`, response.usdCost || 0)
  }

  const workflowConfig = response.data
  const handledWorkflow = handleWorkflowCompletion(options.workflowConfig ?? null, workflowConfig)

  // defensively sanitize any inactive/unknown tools that may have crept in
  const sanitizedHandledWorkflow = sanitizeConfigTools(handledWorkflow)

  // For immediate UI feedback, skip verification by default unless explicitly requested
  if (options.verifyWorkflow === "none" || !options.verifyWorkflow) {
    return {
      success: true,
      data: sanitizedHandledWorkflow,
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

  const { finalConfig, cost } = await validateAndRepairWorkflow(sanitizedHandledWorkflow, repairOptions)

  if (finalConfig === null) {
    return R.error("Failed to enhance workflow, no final config", response.usdCost + cost)
  }

  return R.success(finalConfig, response.usdCost + cost)
}
