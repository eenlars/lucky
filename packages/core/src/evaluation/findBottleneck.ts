import type { FitnessOfWorkflow } from "@core/evaluation/calculate-fitness/fitness.types"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { WorkflowAnalysisPrompts } from "@core/prompts/analyzeWorkflow.p"
import { llmify } from "@core/utils/common/llmify"
import { lgg } from "@core/utils/logging/Logger"
import { MemorySchemaOptional } from "@core/utils/memory/memorySchema"
import type { ModelName } from "@core/utils/spending/models.types"
import type { Workflow } from "@core/workflow/Workflow"
import { z } from "zod"

// this is the first analysis file for workflows.
// it looks at the transcript and suggests a new workflow node.

/**
 * result from workflow bottleneck analysis
 */
export interface WorkflowAnalysisResult {
  mainBottleNeck: string
  improvement: string
  shouldRemoveNode: boolean
  shouldAddNode: boolean
  shouldEditNode: boolean
  improvementSuggestions: string
  cost: number
  memories: Record<string, string> | null
}

const baseSchema = {
  mainBottleNeck: z.string().describe("The main bottleneck identified in the workflow for not reaching 100% accuracy"),
  improvement: z.string().describe(
    llmify(
      `Suggested improvement to address the bottleneck, 
        it may have to do with one specific workflow node 
        that needs to be improved or a change to the workflow 
        that will improve the overall efficiency.`,
    ),
  ),
  shouldRemoveNode: z.boolean().describe("if we need to remove a node, boolean"),
  shouldAddNode: z.boolean().describe("if we need to add a node, boolean"),
  shouldEditNode: z.boolean().describe("if we need to edit a node, boolean"),
  improvementSuggestions: z
    .string()
    .describe("feedback, weaknesses, strengths, improvement suggestions, estimated impact"),
}

/**
 * parameters for workflow analysis
 */
export interface WorkflowAnalysisParams {
  transcript: string
  fitness: FitnessOfWorkflow
  model: ModelName
  previousMemory?: Record<string, string>
}

/**
 * this function analyzes the workflow and identifies bottlenecks,
 * suggests textual improvements, and suggests new tools.
 * it will be called before the workflow is run.
 */
export async function analyzeWorkflowBottlenecks(
  workflow: Workflow,
  params: WorkflowAnalysisParams,
): Promise<WorkflowAnalysisResult> {
  const { transcript, fitness, model, previousMemory = {} } = params

  lgg.log("🔍 Analyzing workflow bottlenecks...")
  lgg.log()

  const { data, success, error, usdCost } = await sendAI({
    messages: WorkflowAnalysisPrompts.analyzeWorkflow(transcript, workflow, fitness, previousMemory),
    model,
    mode: "structured",
    schema: z.object({
      ...baseSchema,
      memories: MemorySchemaOptional.describe(
        "Key-value pairs for workflow memory. Max 2 entries. Should be generic learnings, not specific errors.",
      ),
    }),
  })

  if (!success) {
    throw new Error(error)
  }

  // safely destructure based on what's actually in the schema
  const {
    mainBottleNeck,
    improvement,
    shouldRemoveNode,
    shouldAddNode,
    shouldEditNode,
    memories = null,
    improvementSuggestions,
  } = data

  lgg.log("✅ Workflow analysis completed")
  return {
    mainBottleNeck,
    improvement,
    shouldRemoveNode,
    shouldAddNode,
    shouldEditNode,
    cost: usdCost,
    improvementSuggestions,
    memories:
      memories ||
      workflow
        .getConfig()
        .nodes.map(node => node.memory)
        .reduce(
          (acc, curr) => {
            if (curr?.nodeId && acc) {
              acc[curr.nodeId] = curr.memory || ""
            }
            return acc
          },
          {} as Record<string, string>,
        ) ||
      null,
  }
}
