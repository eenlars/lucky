import { createWorkflowPrompt } from "@/prompts/createWorkflow"
import { WORKFLOW_GENERATION_RULES } from "@/prompts/generationRules"
import { SharedWorkflowPrompts } from "@/prompts/workflowAnalysisPrompts"
import { workflowToStringFromConfig } from "@/workflow/actions/generate/workflowToString"
import type { FitnessOfWorkflow } from "@workflow/actions/analyze/calculate-fitness/fitness.types"
import type { WorkflowConfig } from "@workflow/schema/workflow.types"

export class WorkflowEvolutionPrompts {
  static createJudgePrompt(
    config: WorkflowConfig,
    fitness: FitnessOfWorkflow | undefined,
    feedback: string | undefined
  ) {
    const systemPrompt = `You are an expert workflow optimization judge. Your role is to analyze a workflow and either:
1. Return an improved WorkflowConfig (full JSON) if improvements are needed
2. Return null if the workflow is already optimal

You make decisions based on:
- The current workflow performance (fitness score)
- Identified bottlenecks and improvement suggestions
- The execution transcript showing what actually happened
- The main goal of the workflow

IMPORTANT PRINCIPLES:
- Preserve complex DAG structures where they add value
- Nodes can have multiple predecessors and successors
- Only make changes that directly address identified issues
- Maintain all existing functionality while improving performance
- Always try to find improvements, even if the current solution seems good. Consider alternative approaches.
- ALWAYS preserve the memory field from each node (if it exists) when creating new configs`

    const userPrompt = `Analyze this workflow and decide if improvements are needed.

CURRENT WORKFLOW CONFIG (JSON):
${JSON.stringify(config, null, 2)}

# createWorkflowPrompt:
${createWorkflowPrompt}

# Generation Rules:
${WORKFLOW_GENERATION_RULES}

SIMPLIFIED VIEW:
${workflowToStringFromConfig(config, {
  includeToolExplanations: true,
  includeAdjacencyList: true,
  includeAgents: false, // keep it focused on structure
  easyModelNames: false,
})}

FITNESS:
${JSON.stringify(feedback ?? "No feedback available", null, 2)}
${
  fitness
    ? `
FITNESS METRICS:
- Score: ${fitness.score}/100
- Total Cost: $${fitness.totalCostUsd.toFixed(2)}
- Total Time: ${fitness.totalTimeSeconds}s
- Data Accuracy: ${fitness.accuracy}
`
    : ""
}

TASK:
Based on the analysis above, either:
1. Return an improved WorkflowConfig that addresses the identified issues
2. Return null only if the fitness score is 100 and there are absolutely no possible improvements

When creating an improved config:
- Ensure all node IDs in handOffs arrays exist or are "end"
- For new nodes, use descriptive IDs like "data_validator" or "result_aggregator"
- Select appropriate models based on task complexity
- Choose relevant tools from the available set shown in the simplified view
- ALWAYS include the memory field from the original config for each node (preserve existing memory)
- For new nodes, add an empty memory field: "memory": {}

VARIATION HINTS:
- Try breaking down the verification into smaller, more specific checks
- Try using different tools or tool combinations for the goal
- Try using different models for different tasks.`

    return [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ]
  }

  static judgeOnlyNode(
    config: WorkflowConfig,
    fitness: FitnessOfWorkflow | undefined,
    feedback: string | undefined
  ) {
    const systemPrompt = `You are an expert workflow optimization judge. Your role is to analyze a workflow and decide what single node operation would most improve it.

You must return one of these actions:
1. "addNode" - Add one new node to address a specific bottleneck
2. "removeNode" - Remove one redundant or problematic node
3. "modifyNode" - Modify one existing node to improve performance
4. "doNothing" - The workflow is already optimal

You make decisions based on:
- The current workflow performance (fitness score)
- Identified bottlenecks and improvement suggestions
- The execution transcript showing what actually happened
- The main goal of the workflow

IMPORTANT PRINCIPLES:
- Focus on the single most impactful change
- Consider node relationships and dependencies
- Only suggest changes that directly address identified issues
- Preserve workflow functionality while improving performance`

    const userPrompt = `Analyze this workflow and decide what single node operation would most improve it.

CURRENT WORKFLOW CONFIG (JSON):
${JSON.stringify(config, null, 2)}

# Generation Rules:
${WORKFLOW_GENERATION_RULES}

SIMPLIFIED VIEW:
${workflowToStringFromConfig(config, {
  includeToolExplanations: true,
  includeAdjacencyList: true,
  includeAgents: false, // keep it focused on structure
  easyModelNames: false,
})}

FITNESS:
${JSON.stringify(feedback ?? "No feedback available", null, 2)}
${
  fitness
    ? `
FITNESS METRICS:
- Score: ${fitness.score}/100
- Total Cost: $${fitness.totalCostUsd.toFixed(2)}
- Total Time: ${fitness.totalTimeSeconds}s
- Data Accuracy: ${fitness.accuracy}
`
    : ""
}

TASK:
Return the single most impactful node operation:
- "addNode" if adding one specific node would address the biggest bottleneck
- "removeNode" if removing one node would improve efficiency without losing functionality
- "modifyNode" if changing one existing node would solve the main performance issue
- "doNothing" if the fitness score is 100 or no single node change would meaningfully improve performance

Focus on the ONE change that would have the biggest positive impact.

explain in detail which connections need to be made.

`

    return [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ]
  }

  static judgeWithExploration(
    config: WorkflowConfig,
    fitness: FitnessOfWorkflow | undefined,
    feedback: string | undefined,
    structureInfo?: {
      recommendedStructure: string
      structuralReason: string
      shouldImplement: boolean
    }
  ): string {
    const workflowStructure =
      structureInfo?.recommendedStructure ||
      SharedWorkflowPrompts.randomWorkflowStructure()
    const shouldImplementStructure = structureInfo?.shouldImplement ?? true
    const structuralAnalysis =
      structureInfo?.structuralReason ||
      "No prior structural analysis available"

    const systemPrompt = `You are an expert workflow structural optimization judge. Your role is to analyze a workflow and generate an improved workflow configuration that implements better structural patterns.

Your job is to return a complete improved WorkflowConfig (full JSON) that implements the recommended structural pattern, or return null if the current structure is already optimal.

You make decisions based on:
- The current workflow performance (fitness score)
- Identified structural bottlenecks and inefficiencies
- The execution transcript showing what actually happened
- The main goal of the workflow
- Structural analysis and recommendations

IMPORTANT PRINCIPLES:
- Focus on structural transformation, not individual node changes
- Implement complete workflow architecture improvements
- Consider workflow patterns like parallel-aggregation, sequential pipelines, hub-and-spoke
- Only restructure if it directly addresses identified performance issues
- Preserve all functionality while improving structural efficiency
- Follow structural recommendations when they would improve performance

STRUCTURAL ANALYSIS:
Recommended structure: ${workflowStructure}
Should implement: ${shouldImplementStructure}
Analysis: ${structuralAnalysis}

${
  shouldImplementStructure
    ? "PRIORITY: Consider implementing this structural pattern if it addresses workflow bottlenecks."
    : "NOTE: The structural analysis suggests this pattern may not be beneficial for this workflow."
}`

    const userPrompt = `Analyze this workflow and generate an improved WorkflowConfig that implements better structural patterns, or return null if no structural improvements are needed.

CURRENT WORKFLOW CONFIG (JSON):
${JSON.stringify(config, null, 2)}

# Generation Rules:
${WORKFLOW_GENERATION_RULES}

SIMPLIFIED VIEW:
${workflowToStringFromConfig(config, {
  includeToolExplanations: true,
  includeAdjacencyList: true,
  includeAgents: false,
  easyModelNames: false,
})}

FITNESS:
${JSON.stringify(feedback ?? "No feedback available", null, 2)}
${
  fitness
    ? `
FITNESS METRICS:
- Score: ${fitness.score}/100
- Total Cost: $${fitness.totalCostUsd.toFixed(2)}
- Total Time: ${fitness.totalTimeSeconds}s
- Data Accuracy: ${fitness.accuracy}
`
    : ""
}

STRUCTURAL GUIDANCE:
Structure Pattern: ${workflowStructure}
Recommendation: ${shouldImplementStructure ? "IMPLEMENT" : "AVOID"}
Analysis: ${structuralAnalysis}

TASK:
Generate a complete improved WorkflowConfig JSON that implements the recommended structural pattern, or return null if no structural improvements would meaningfully improve performance.

Focus on structural transformation that would have the biggest positive impact. Consider:
- Parallel processing opportunities
- Sequential bottlenecks that could be restructured
- Hub-and-spoke vs linear patterns
- Aggregation and branching optimizations

Explain how the new structure addresses identified performance issues and implements the structural recommendations.`

    return systemPrompt + "\n\n" + userPrompt
  }
}
