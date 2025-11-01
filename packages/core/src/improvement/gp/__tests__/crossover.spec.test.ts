import { Crossover } from "@core/improvement/gp/operators/crossover/Crossover"
import { workflowConfigToGenome } from "@core/improvement/gp/rsc/wrappers"
import { lgg } from "@core/utils/logging/Logger"
import type { EvaluationInput } from "@core/workflow/ingestion/ingestion.types"
import { describe, expect, test } from "vitest"

import { getDefaultModels } from "@core/core-config/coreConfig"
// Import the parent setup files
import parentSetup1 from "@core/improvement/gp/__tests__/setup/setupfile-parent-1.json"
import parentSetup2 from "@core/improvement/gp/__tests__/setup/setupfile-parent-2.json"
import type { EvolutionContext } from "@core/improvement/gp/rsc/gp.types"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"

describe("Crossover Integration Test", () => {
  test("crossover between real parent genomes produces valid offspring evaluated by LLM", async () => {
    // Create test evaluation input and evolution context
    const evaluationInput: EvaluationInput = {
      type: "text",
      question: "Find physical store locations for debontekoe.nl",
      answer: "Find physical store locations for debontekoe.nl",
      goal: "Find physical store locations for debontekoe.nl",
      workflowId: "test-workflow-crossover",
    }

    const evolutionContext: EvolutionContext = {
      runId: "test-run-crossover",
      generationId: "test-gen-1",
      generationNumber: 1,
    }

    // Convert JSON configs to Genome objects
    const { data: parent1 } = await workflowConfigToGenome({
      workflowConfig: parentSetup1 as unknown as WorkflowConfig,
      parentWorkflowVersionIds: [],
      evaluationInput,
      _evolutionContext: evolutionContext,
      operation: "init",
      verboseId: "setupfile-parent-1",
    })

    const { data: parent2 } = await workflowConfigToGenome({
      workflowConfig: parentSetup2 as unknown as WorkflowConfig,
      parentWorkflowVersionIds: ["00143667"],
      evaluationInput,
      _evolutionContext: evolutionContext,
      operation: "init",
      verboseId: "setupfile-parent-2",
    })

    if (!parent1 || !parent2) {
      throw new Error("Failed to create parent genomes")
    }

    // Perform crossover
    const { data: offspring } = await Crossover.crossover({
      parents: [parent1, parent2],
      verbose: false,
      evaluationInput,
      _evolutionContext: evolutionContext,
    })

    if (!offspring) {
      throw new Error("Failed to create offspring")
    }

    // Verify basic properties
    expect(offspring).toBeDefined()
    expect(offspring.genome.parentWorkflowVersionIds.length).toBe(2)
    expect(offspring.getWorkflowConfig().nodes).toBeDefined()
    expect(offspring.getWorkflowConfig().nodes.length).toBeGreaterThan(0)

    // LLM-based evaluation
    const evaluationPrompt = `Does this crossover result show valid combination of parent workflows (very general)?
    amount of nodes does not matter. just: does it look like a valid combination of parent workflows?
Parent1: ${parent1.getWorkflowConfig().nodes.length} nodes, entry: ${parent1.getWorkflowConfig().entryNodeId}
Parent2: ${parent2.getWorkflowConfig().nodes.length} nodes, entry: ${parent2.getWorkflowConfig().entryNodeId}  
Offspring: ${offspring.getWorkflowConfig().nodes.length} nodes, entry: ${offspring.getWorkflowConfig().entryNodeId}

Answer PASS or FAIL with brief reason.`

    const evaluationResponse = await sendAI({
      messages: [{ role: "user", content: evaluationPrompt }],
      model: getDefaultModels().default,
      mode: "text",
    })

    const result = evaluationResponse.data?.text.trim().toUpperCase().startsWith("PASS")

    if (!result) {
      lgg.info("LLM Evaluation failed:", evaluationResponse)
    }

    expect(result).toBe(true)
  }, 30000) // 30 second timeout for LLM operations
})
