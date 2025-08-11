import type { FitnessOfWorkflow } from "@core/evaluation/calculate-fitness/fitness.types"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { WorkflowEvolutionPrompts } from "@core/prompts/improveWorkflow.p"
import { type CodeToolName } from "@core/tools/tool.types"
import { guard } from "@core/workflow/schema/errorMessages"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { WorkflowConfigSchema } from "@core/workflow/schema/workflowSchema"
import { CONFIG } from "@runtime/settings/constants"
import { getDefaultModels } from "@runtime/settings/models"

export interface UnifiedImprovementParams {
  config: WorkflowConfig
  fitness: FitnessOfWorkflow
  feedback: string
}

export interface UnifiedImprovementResult {
  improvedConfig: WorkflowConfig | null
  cost: number
}

/**
 * Unified workflow improvement following the flow:
 * 1. Convert old_schema_full_json to simple schema
 * 2. Call analyzeWorkflowBottlenecks
 * 3. LLM judge outputs new_schema_full_json or null
 */
//todo-leak :: Unified improvement function receives fitness parameter during improvement
export async function improveWorkflowUnified(
  params: UnifiedImprovementParams
): Promise<UnifiedImprovementResult> {
  const { config, fitness, feedback } = params
  let totalCost = 0

  let improvedConfig: WorkflowConfig | null = null

  guard(fitness, "Fitness not set")
  guard(feedback, "Feedback not set")

  // step 4: llm judge with full json input/output
  const { data, success, error, usdCost } = await sendAI({
    // watch out: this is without the easyModelNames option!
    messages: WorkflowEvolutionPrompts.createJudgePrompt(
      config,
      fitness,
      feedback
    ),
    model: getDefaultModels().reasoning,
    mode: "structured",
    schema: WorkflowConfigSchema,
    output: "object",
    opts: {
      reasoning: true,
    },
  })

  improvedConfig = data as WorkflowConfig | null

  if (improvedConfig) {
    // add the default tools to the config
    const defaultTools = Array.from(CONFIG.tools.defaultTools) as CodeToolName[]
    improvedConfig.nodes.forEach((node) => {
      node.codeTools = [...new Set([...node.codeTools, ...defaultTools])]
    })
  }

  if (!success) throw new Error(`Failed to get workflow improvements: ${error}`)

  totalCost += usdCost

  return {
    improvedConfig,
    cost: totalCost,
  }
}
