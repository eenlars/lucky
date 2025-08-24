import type { FitnessOfWorkflow } from "@core/evaluation/calculate-fitness/fitness.types"
import { adjustWorkflowOneNode } from "@core/improvement/behavioral/judge/adjustWorkflowOneNode"
import { improveNodesSelfImprovement } from "@core/improvement/behavioral/judge/improveNode"
import { improveWorkflowUnified } from "@core/improvement/behavioral/judge/improveWorkflow"
import { adjustWorkflowStructure } from "@core/improvement/behavioral/judge/judgeWithStructure"
import { parseCliArguments } from "@core/utils/cli/argumentParser"
import { lgg } from "@core/utils/logging/Logger"
import { validateAndRepairWorkflow } from "@core/utils/validation/validateWorkflow"
import { guard } from "@core/workflow/schema/errorMessages"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { Workflow, WorkflowImprovementResult } from "@core/workflow/Workflow"
import { CONFIG } from "@runtime/settings/constants"

/**
 * Configuration options for the improvement process components
 */
export interface ImprovementOptions {
  enableNodeSelfImprovement?: boolean
  enableWorkflowAnalysis?: boolean
  enableWorkflowVerification?: boolean
  enableResultPersistence?: boolean
  improvementType?: "judge" | "unified"
}

/**
 * Main parameters for the iterative improvement process
 */
export interface IterativeImprovementParams {
  _fitness: FitnessOfWorkflow
  workflowInvocationId: string
}

/**
 * Main orchestrator function that composes all improvement steps
 */
export async function improveNodesIterativelyImpl(
  workflow: Workflow,
  params: IterativeImprovementParams
): Promise<WorkflowImprovementResult> {
  const { _fitness, workflowInvocationId } = params
  let totalCost = 0
  // use the improved configuration or keep current if no improvements needed
  let finalConfig: WorkflowConfig = workflow.getConfig()

  // Parse CLI arguments for runtime configuration
  const args = process.argv.slice(2)
  const parsedArgs = parseCliArguments(args)

  // Use CLI args if provided, otherwise fall back to CONFIG
  const selfImproveNodes =
    parsedArgs.selfImproveNodes ?? CONFIG.improvement.flags.selfImproveNodes
  const improvementType =
    parsedArgs.improvementType ?? CONFIG.improvement.flags.improvementType

  lgg.log("🚀 Starting iterative improvement process...")

  // step 1: agent self-improvement (optional)
  if (selfImproveNodes) {
    const improvedNodes = await improveNodesSelfImprovement(workflow, {
      workflowInvocationId,
      fitness: _fitness,
      setup: finalConfig,
      goal: workflow.goal,
      feedback: workflow.getFeedback() ?? "no feedback",
    })
    // update the base config with improved nodes
    finalConfig = {
      ...finalConfig,
      nodes: improvedNodes,
    }
  }

  // step 2: unified workflow improvement (includes analysis)
  // if self-improvement happened, we need to create a workflow with the improved nodes
  const workflowForImprovement = selfImproveNodes
    ? Workflow.create({
        config: finalConfig,
        evaluationInput: workflow.getEvaluationInput(),
        toolContext: workflow.getToolExecutionContext(workflowInvocationId),
      })
    : workflow

  switch (improvementType) {
    case "judge": {
      const mechanicChangesNode = Math.random() < 0.5

      let mechanicResult
      if (mechanicChangesNode) {
        // Adjustor applies a single-node change (with internal formalization)
        mechanicResult = await adjustWorkflowOneNode(
          workflowForImprovement.getConfig(),
          workflowForImprovement.getFeedback() ?? "No feedback available",
          workflowForImprovement.getFitness()!
        )
      } else {
        // Adjustor applies a structural change (with internal formalization)
        mechanicResult = await adjustWorkflowStructure(
          workflowForImprovement.getConfig(),
          workflowForImprovement.getFeedback() ?? "No feedback available",
          workflowForImprovement.getFitness()!
        )
      }

      if (!mechanicResult.success) {
        lgg.error("Judge function failed:", mechanicResult.error)
        // Fall back to unified approach
        const { improvedConfig, cost: improvementCost } =
          await improveWorkflowUnified({
            config: workflowForImprovement.getConfig(),
            fitness: workflowForImprovement.getFitness()!,
            feedback:
              workflowForImprovement.getFeedback() ?? "No feedback available",
          })
        totalCost += improvementCost
        finalConfig = improvedConfig ?? workflowForImprovement.getConfig()
      } else {
        // Use the judge result
        totalCost += mechanicResult.usdCost || 0
        finalConfig = mechanicResult.data
      }
      break
    }

    case "unified": {
      // Use unified workflow improvement approach
      const { improvedConfig, cost: improvementCost } =
        await improveWorkflowUnified({
          config: workflowForImprovement.getConfig(),
          fitness: workflowForImprovement.getFitness()!,
          feedback:
            workflowForImprovement.getFeedback() ?? "No feedback available",
        })
      totalCost += improvementCost
      finalConfig = improvedConfig ?? workflowForImprovement.getConfig()
      break
    }

    default: {
      const _exhaustiveCheck: never = improvementType
      void _exhaustiveCheck
      throw new Error(`Unknown improvement type: ${improvementType}`)
    }
  }

  // step 3: workflow validation and repair (this goes beyond the zod schema validation)
  const configToValidate = finalConfig
  const { finalConfig: validatedConfig, cost: validationCost } =
    await validateAndRepairWorkflow(configToValidate)
  guard(validatedConfig, "Workflow validation and repair failed unexpectedly")
  totalCost += validationCost

  lgg.log(
    `✅ Iterative improvement process completed with ${improvementType} improvement type`
  )
  return {
    newConfig: validatedConfig,
    cost: totalCost,
  }
}
