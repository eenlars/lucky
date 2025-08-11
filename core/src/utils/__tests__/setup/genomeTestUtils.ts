// Genome test utilities without problematic vi.mock calls
import type { FitnessOfWorkflow } from "@core/evaluation/calculate-fitness/fitness.types"
import type { WorkflowGenome } from "@core/improvement/gp/resources/gp.types"
import type { EvaluationInput } from "@core/workflow/ingestion/ingestion.types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { getDefaultModels } from "@runtime/settings/constants.client"

export const createMockWorkflowGenome = (
  generationNumber = 0,
  parentIds: string[] = []
): WorkflowGenome => ({
  nodes: [
    {
      nodeId: "node1",
      description: "test system prompt",
      systemPrompt: "test system prompt",
      modelName: getDefaultModels().default,
      mcpTools: [],
      codeTools: [],
      handOffs: [],
      memory: {},
    },
    {
      nodeId: "node2",
      description: "test system prompt 2",
      systemPrompt: "test system prompt 2",
      modelName: getDefaultModels().default,
      mcpTools: [],
      codeTools: [],
      handOffs: [],
      memory: {},
    },
  ],
  entryNodeId: "node1",
  _evolutionContext: {
    runId: "test-run-id",
    generationId: "0",
    generationNumber,
  },
  parentWorkflowVersionIds: parentIds,
  createdAt: new Date().toISOString(),
  evaluationResults: undefined,
})

export const createMockWorkflowConfig = (): WorkflowConfig => ({
  nodes: [
    {
      nodeId: "node1",
      description: "test system prompt",
      systemPrompt: "test system prompt",
      modelName: getDefaultModels().default,
      mcpTools: [],
      codeTools: [],
      handOffs: [],
      memory: {},
    },
    {
      nodeId: "node2",
      description: "test system prompt 2",
      systemPrompt: "test system prompt 2",
      modelName: getDefaultModels().default,
      mcpTools: [],
      codeTools: [],
      handOffs: [],
      memory: {},
    },
  ],
  entryNodeId: "node1",
})

export const createMockEvaluationInputGeneric = (): EvaluationInput => ({
  type: "text",
  question: "What is 2+2?",
  answer: "4",
  goal: "Calculate the sum",
  workflowId: "test-workflow-id",
})

export const createMockWorkflowScore = (): FitnessOfWorkflow => ({
  score: 0.8,
  totalCostUsd: 0.1,
  totalTimeSeconds: 5,
  accuracy: 0.9,
  novelty: 0.7,
})
