// Genome test utilities without problematic vi.mock calls
import { MODELS } from "@/utils/models/models"
import type { FitnessOfWorkflow } from "@/workflow/actions/analyze/calculate-fitness/fitness.types"
import type { EvaluationInput } from "@/workflow/ingestion/ingestion.types"
import type { WorkflowConfig } from "@/workflow/schema/workflow.types"
import type { WorkflowGenome } from "@gp/resources/gp.types"

export const createMockWorkflowGenome = (
  generationNumber = 0,
  parentIds: string[] = []
): WorkflowGenome => ({
  nodes: [
    {
      nodeId: "node1",
      description: "test system prompt",
      systemPrompt: "test system prompt",
      modelName: MODELS.default,
      mcpTools: [],
      codeTools: [],
      handOffs: [],
      memory: {},
    },
    {
      nodeId: "node2",
      description: "test system prompt 2",
      systemPrompt: "test system prompt 2",
      modelName: MODELS.default,
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
      modelName: MODELS.default,
      mcpTools: [],
      codeTools: [],
      handOffs: [],
      memory: {},
    },
    {
      nodeId: "node2",
      description: "test system prompt 2",
      systemPrompt: "test system prompt 2",
      modelName: MODELS.default,
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
