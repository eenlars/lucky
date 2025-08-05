export const SharedWorkflowPrompts = {
  // shared principles and structures
  workflowPrinciples: `IMPORTANT PRINCIPLES:
1. Workflows are directed acyclic graphs (DAGs) that can have complex structures
2. Nodes can have multiple predecessors (many-to-one merge points)
3. Nodes can have multiple successors (one-to-many branching points)
4. Parallel processing paths are encouraged where they improve performance
5. The entry node connects to one or more initial processing nodes
6. Terminal nodes connect to "end"`,

  workflowStructures: [
    // "Parallel processing: Use branching (one-to-many) for independent tasks that can run concurrently, merging results later.",
    "LLM-as-a-judge: Add a node that evaluates and scores outputs from previous nodes.",
    "Multi-step reasoning: Sequence nodes where each builds on the previous one's output for complex tasks.",
    "Validation pipeline: Create nodes for input checking, main processing, and output verification.",
    "Iterative refinement: Use feedback loops simulated through sequential nodes (e.g., generate, critique, improve).",
    "Specialized experts: Assign different nodes to handle specific aspects like analysis or formatting.",
    "Quality gates: Insert checkpoint nodes that assess and potentially reroute based on quality.",
    "Fallback patterns: Add alternative paths triggered when primary nodes fail.",
    "Data transformation pipeline: Chain nodes that progressively modify and enrich data.",
  ],

  randomWorkflowStructure: () => {
    const patterns = SharedWorkflowPrompts.workflowStructures
    const chosenPattern = patterns[Math.floor(Math.random() * patterns.length)]
    return chosenPattern
  },

  promptPatterns: [
    "Ensemble prompting: Prompt the model to simulate multiple experts debating the solution.",
    "Chain-of-thought: Instruct step-by-step reasoning in the prompt.",
    'Role-playing: Assign expert personas to the model (e.g., "Act as a data analyst").',
    "Self-reflection: Ask the model to critique and improve its own response.",
    "Comparative analysis: Have the model evaluate multiple options side-by-side.",
    "Structured output: Specify exact formats like JSON for parseable responses.",
    "Context injection: Include relevant background info dynamically in prompts.",
    "Progressive refinement: Build on previous outputs in follow-up prompts.",
    "Multi-perspective synthesis: Combine views from different angles.",
    "Question decomposition: Break down complex queries into sub-questions.",
    "Evidence-based reasoning: Require justifications and sources for claims.",
    "Metacognitive prompting: Ask for reasoning explanation and confidence scores.",
    "Constraint satisfaction: State explicit requirements and limitations.",
    "Analogical reasoning: Use metaphors to explain concepts.",
    "Few-shot prompting: Provide examples in the prompt to guide responses.",
    // not prompt patterns, but debugging patterns
    "make the prompt more detailed and specific", // this is a debugging pattern
    "make the prompt more concise and to the point", // this is a debugging pattern
    "change the prompt to have another perspective", // this is a debugging pattern
  ],

  randomPromptPattern: () => {
    const patterns = SharedWorkflowPrompts.promptPatterns
    const chosenPattern = patterns[Math.floor(Math.random() * patterns.length)]
    return chosenPattern
  },

  agenticPatterns: `
splitting task in multiple nodes, combining the results by letting the nodes talk to each other. ensemble+llm-debate
`,

  bottleneckAnalysisSection: (analysisResult: any) => {
    if (!analysisResult) return ""

    return `
BOTTLENECK ANALYSIS:
- Main bottleneck: ${analysisResult.mainBottleNeck}
- Improvement suggestion: ${analysisResult.improvement}
- Should add node: ${analysisResult.shouldAddNode}
- Should remove node: ${analysisResult.shouldRemoveNode}
- Should edit node: ${analysisResult.shouldEditNode}`
  },

  fitnessMetricsSection: (fitness: any) => `FITNESS METRICS:
- Score: ${fitness.score}
- Total Cost: $${fitness.totalCostUsd.toFixed(2)}
- Total Time: ${fitness.totalTimeSeconds.toFixed(1)}s
- Data Accuracy: ${fitness.accuracy}`,

  improvementTaskInstructions: `TASK:
1. Analyze the current workflow's performance based on the transcript and fitness
2. Identify specific nodes or connections that are underperforming
3. Propose improvements that may include:
   - Adding new nodes (with appropriate tools and connections)
   - Editing existing nodes (description, prompt, tools)
   - Removing redundant or problematic nodes
   - Restructuring connections for better parallelism or flow`,

  workflowReminders: `IMPORTANT REMINDERS:
- Preserve or enhance complex structures where they add value
- Consider parallel processing opportunities
- Ensure all nodes have appropriate connections
- New nodes should have unique IDs like "new_analyzer" or "new_validator"
- Maintain the DAG property (no cycles)
- Entry node should remain as is but can connect to multiple nodes
- Terminal nodes must connect to "end"`,
}
