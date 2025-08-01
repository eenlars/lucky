import { toolsExplanations } from "@/core/prompts/explainTools"
import { SharedWorkflowPrompts } from "@/core/prompts/workflowAnalysisPrompts"
import { llmify } from "@/core/utils/common/llmify"
import type { FitnessOfWorkflow } from "@workflow/actions/analyze/calculate-fitness/fitness.types"
import type { Workflow } from "@workflow/Workflow"
import type { CoreMessage } from "ai"

export const WorkflowAnalysisPrompts = {
  // This is the judge that analyzes a workflow its messaging
  // and checks what the bottleneck is for not reaching the right accuracy.
  analyzeWorkflow: (
    transcript: string,
    workflow: Workflow,
    fitness: FitnessOfWorkflow,
    previousMemory: Record<string, string> = {}
  ): CoreMessage[] => {
    return [
      {
        // todo-cost: this has a downside: it actually needs a smart model, but putting in the transcript will make the context
        // huge and so also expensive.
        role: "user",
        content: llmify(`
      ${SharedWorkflowPrompts.improvementTaskInstructions}
      
      Focus on analyzing why the workflow isn't reaching 100% accuracy and suggest specific improvements.
      
      Transcript: ${transcript}
      Workflow: ${llmify(
        workflow.toString({
          includeToolExplanations: true,
          includeAdjacencyList: true,
          includeAgents: true,
          easyModelNames: false,
        })
      )}
      ${SharedWorkflowPrompts.fitnessMetricsSection(fitness)}
      
      the possible tools to use are: ${toolsExplanations()}
      
      PREVIOUS WORKFLOW MEMORY:
      ${Object.keys(previousMemory).length > 0 ? JSON.stringify(previousMemory, null, 2) : "No previous memory"}
      
      MEMORY GUIDELINES:
      - Review the previous memory and keep what is still relevant
      - Add 1-2 new generic learnings from this analysis (max 2 total new entries)
      - Memory should contain high-level patterns, not specific errors
      - Avoid negative statements like "always fails" or "never works"
      - Focus on constructive observations like "needs approach X for Y"
      - Memory keys should be descriptive like "data_processing_pattern" not "error1"
      - Each memory value should be a single clear sentence
      
      Example good memories:
      {
        "parallel_processing": "Parallel tool execution improves speed for independent tasks",
        "validation_pattern": "Input validation before processing prevents downstream errors"
      }
      
      Example bad memories (don't do this):
      {
        "error": "Failed to process data",
        "problem": "System always crashes"
      }
          
      `),
      },
    ]
  },
}
