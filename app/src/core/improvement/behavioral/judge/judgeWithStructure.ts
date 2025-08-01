import { WorkflowEvolutionPrompts } from "@/core/prompts/improveWorkflow.p"
import { R, type RS } from "@/core/utils/types"
import type { FitnessOfWorkflow } from "@/core/workflow/actions/analyze/calculate-fitness/fitness.types"
import type { WorkflowConfig } from "@/core/workflow/schema/workflow.types"
import { Workflow } from "@/core/workflow/Workflow"
import type { StructureExplorationResult } from "./exploreStructure"

export async function judgeWithStructure(
  workflow: WorkflowConfig,
  feedback: string,
  fitness: FitnessOfWorkflow,
  structureInfo: StructureExplorationResult
): Promise<RS<WorkflowConfig>> {
  const prompt = WorkflowEvolutionPrompts.judgeWithExploration(
    workflow,
    fitness,
    feedback,
    structureInfo
  )

  const { success, data, error, usdCost } = await Workflow.formalizeWorkflow(
    prompt,
    {
      workflowConfig: workflow,
      verifyWorkflow: "normal",
      repairWorkflowAfterGeneration: true,
    }
  )

  if (!success || !data)
    return R.error(error || "Failed to generate improved workflow", usdCost)

  return R.success(data, usdCost)
}
