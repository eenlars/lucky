import type { FitnessOfWorkflow } from "@core/evaluation/calculate-fitness/fitness.types"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { WorkflowEvolutionPrompts } from "@core/prompts/improveWorkflow.p"
import { R, type RS } from "@core/utils/types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { Workflow } from "@core/workflow/Workflow"
import { getDefaultModels } from "@core/core-config/compat"
import z from "zod"
import type { StructureExplorationResult } from "./exploreStructure"

export interface MechanicAdvisorStructureResult {
  instruction: string
  explanation: string
  recommendedStructure?: string
  shouldImplement?: boolean
}

export async function adjustWorkflowStructure(
  workflow: WorkflowConfig,
  feedback: string,
  fitness: FitnessOfWorkflow,
  structureInfo?: StructureExplorationResult
): Promise<RS<WorkflowConfig>> {
  const messages = WorkflowEvolutionPrompts.mechanicAdvisorStructure(workflow, fitness, feedback, structureInfo)

  const response = await sendAI({
    model: getDefaultModels().reasoning,
    messages,
    mode: "structured",
    schema: z.object({
      instruction: z.string(),
      explanation: z.string(),
      recommendedStructure: z.string().optional(),
      shouldImplement: z.boolean().optional(),
    }),
  })

  if (!response.success || !response.data) {
    return R.error(response.error || "Failed to get advisor response for structure", response.usdCost)
  }

  const formalized = await Workflow.formalizeWorkflow(response.data.instruction, {
    workflowConfig: workflow,
    verifyWorkflow: "normal",
    repairWorkflowAfterGeneration: true,
  })

  const totalCost = (response.usdCost || 0) + (formalized.usdCost || 0)
  if (!formalized.success) {
    return R.error(formalized.error, totalCost)
  }

  return R.success(formalized.data, totalCost)
}
