// Comprehensive mock file for tests
import type { EvolutionSettings } from "@improvement/gp/resources/evolution-types"
import type {
  GenomeEvaluationResults,
  WorkflowGenome,
} from "@improvement/gp/resources/gp.types"
import { type RS } from "@utils/types"
import type {
  EvaluationInput,
  EvaluationText,
  WorkflowIO,
} from "@workflow/ingestion/ingestion.types"
import type {
  FlowEvolutionConfig,
  FlowRuntimeConfig,
} from "@utils/config/runtimeConfig.types"
import type { FitnessOfWorkflow } from "@workflow/actions/analyze/calculate-fitness/fitness.types"
import type { WorkflowConfig } from "@workflow/schema/workflow.types"
import { vi } from "vitest"

// ====== BASIC MOCK FUNCTIONS ======

export const setupCoreTest = () => {
  // Basic test setup
}

export const mockSuccessfulAIResponse = <T>(data: T): RS<T> => ({
  success: true,
  data,
  error: undefined,
  usdCost: 0.01,
})

export const mockFailedAIResponse = <T>(error: string): RS<T> => ({
  success: false,
  data: undefined,
  error,
  usdCost: 0,
})

// ====== EVALUATION INPUT FACTORIES ======

export const createMockEvaluationInput = (
  overrides?: Partial<EvaluationInput>
): EvaluationInput =>
  ({
    type: "text",
    question: "Test question",
    answer: "Test answer",
    goal: "Test goal",
    ...overrides,
  }) as EvaluationText

export const createMockEvaluationInputGeneric = createMockEvaluationInput

// ====== WORKFLOW IO FACTORIES ======

export const createMockWorkflowIO = (
  overrides?: Partial<WorkflowIO>
): WorkflowIO => ({
  workflowInput: "Test input",
  expectedWorkflowOutput: "Test output",
  ...overrides,
})

export const createMockWorkflowFile = (overrides?: any): any => ({
  name: "test-file.txt",
  content: "Test content",
  type: "text/plain",
  size: 100,
  lastModified: Date.now(),
  ...overrides,
})

// ====== WORKFLOW CONFIG FACTORIES ======

export const createMockWorkflowConfig = (
  overrides?: Partial<WorkflowConfig>
): WorkflowConfig => ({
  nodes: [
    {
      nodeId: "node1",
      description: "test system prompt",
      systemPrompt: "test system prompt",
      modelName: "google/gemini-2.5-flash-lite",
      mcpTools: [],
      codeTools: [],
      handOffs: [],
      memory: {},
    },
  ],
  entryNodeId: "node1",
  ...overrides,
})

// ====== GENOME FACTORIES ======

export const createMockGenome = (overrides?: any) => {
  const mockGenome = {
    genome: {} as WorkflowGenome,
    genomeEvaluationResults: {} as GenomeEvaluationResults,
    evolutionCost: 0,
    isEvaluated: false,
    getWorkflowVersionId: vi.fn().mockReturnValue("test-version-id"),
    getWorkflowConfig: vi.fn().mockReturnValue(createMockWorkflowConfig()),
    getEvaluationInput: vi.fn().mockReturnValue(createMockEvaluationInput()),
    getWorkflowId: vi.fn().mockReturnValue("test-workflow-id"),
    getConfig: vi.fn().mockReturnValue(createMockWorkflowConfig()),
    getContextStore: vi.fn().mockReturnValue({}),
    hash: vi.fn().mockReturnValue("test-hash"),
    clone: vi.fn().mockReturnThis(),
    toString: vi.fn().mockReturnValue("mock-genome"),
    ...overrides,
  }
  return mockGenome
}

// ====== FITNESS AND EVALUATION ======

export const createMockWorkflowScore = (score = 0.8): FitnessOfWorkflow => ({
  score,
  accuracy: 80,
  novelty: 80,
  totalCostUsd: 0.01,
  totalTimeSeconds: 1.5,
})

// ====== WORKFLOW FACTORIES ======

export const createMockWorkflow = (options?: any) => {
  const mockWorkflow = {
    getConfig: vi.fn().mockReturnValue(createMockWorkflowConfig()),
    getContextStore: vi.fn().mockReturnValue({}),
    getWorkflowVersionId: vi.fn().mockReturnValue("test-version-id"),
    getEvaluationInput: vi.fn().mockReturnValue(createMockEvaluationInput()),
    getWorkflowFiles: vi.fn().mockReturnValue(new Set()),
    addWorkflowFile: vi.fn(),
    hasWorkflowFile: vi.fn().mockReturnValue(false),
    canCreateWorkflowFile: vi.fn().mockReturnValue(true),
    run: vi.fn().mockResolvedValue({ success: true, data: [] }),
    evaluate: vi
      .fn()
      .mockResolvedValue({ success: true, data: createMockWorkflowScore() }),
    getFitness: vi.fn().mockReturnValue(createMockWorkflowScore()),
    getFitnessScore: vi.fn().mockReturnValue(0.8),
    hash: vi.fn().mockReturnValue("test-hash"),
    clone: vi.fn().mockReturnThis(),
    toString: vi.fn().mockReturnValue("mock-workflow"),
    ...options,
  }
  return mockWorkflow
}

// ====== EVOLUTION AND GP MOCKS ======

export const createMockEvolutionSettings = (
  overrides?: Partial<EvolutionSettings>
): EvolutionSettings => ({
  populationSize: 10,
  verbose: false,
  maximumTimeMinutes: 60,
  tournamentSize: 3,
  eliteSize: 2,
  maxEvaluationsPerHour: 100,
  maxCostUSD: 10.0,
  evaluationDataset: "test-dataset",
  baselineComparison: false,
  mutationParams: {
    mutationInstructions: "test mutation instructions",
  },
  crossoverRate: 0.8,
  mutationRate: 0.2,
  offspringCount: 4,
  numberOfParentsCreatingOffspring: 2,
  noveltyWeight: 0.5,
  immigrantRate: 0.1,
  immigrantInterval: 5,
  generations: 5,
  ...overrides,
})

export const createMockEvaluator = () => ({
  evaluate: vi.fn().mockResolvedValue(createMockWorkflowScore()),
  evaluateGenome: vi.fn().mockResolvedValue(createMockWorkflowScore()),
})

export const createMockCrossoverParams = (overrides?: {
  parents?: any[]
  verbose?: boolean
  evaluationInput?: EvaluationInput
  _evolutionContext?: any
}) => ({
  parents: overrides?.parents || [createMockGenome(), createMockGenome()],
  verbose: overrides?.verbose !== undefined ? overrides.verbose : false,
  evaluationInput: overrides?.evaluationInput || createMockEvaluationInput(),
  _evolutionContext: overrides?._evolutionContext || {
    runId: "test-run-id",
    generationId: "test-gen-id",
    generationNumber: 0,
  },
})

// ====== RUNTIME CONFIG MOCKS ======

export const createMockFullFlowRuntimeConfig = (
  overrides?: any
): FlowRuntimeConfig => ({
  coordinationType: "sequential" as const,
  newNodeProbability: 0.7,
  logging: {
    level: "info" as const,
    override: {},
  },
  workflow: {
    parallelExecution: true,
    asyncExecution: true,
    maxNodeInvocations: 14,
    maxNodes: 100,
    handoffContent: "summary" as const,
    prepareProblem: true,
    prepareProblemMethod: "ai" as const,
    prepareProblemWorkflowVersionId: "test-version-id",
  },
  tools: {
    inactive: new Set(),
    defaultTools: new Set(),
    uniqueToolsPerAgent: false,
    uniqueToolSetsPerAgent: false,
    maxToolsPerAgent: 6,
    maxStepsVercel: 1,
    autoSelectTools: false,
    usePrepareStepStrategy: false,
    showParameterSchemas: false,
    experimentalMultiStepLoop: false,
    experimentalMultiStepLoopMaxRounds: 3,
  },
  models: {
    provider: "openai" as const,
    inactive: new Set<string>(),
    models: {
      summary: "google/gemini-2.5-flash-lite" as const,
      low: "google/gemini-2.5-flash-lite" as const,
      fallback: "google/gemini-2.5-flash-lite" as const,
      nano: "google/gemini-2.5-flash-lite" as const,
      medium: "google/gemini-2.5-pro-preview" as const,
      high: "anthropic/claude-sonnet-4" as const,
      default: "google/gemini-2.5-flash-lite" as const,
      fitness: "google/gemini-2.5-flash-lite" as const,
      reasoning: "anthropic/claude-sonnet-4" as const,
    },
  },
  improvement: {
    fitness: {
      timeThresholdSeconds: 30,
      baselineTimeSeconds: 5,
      baselineCostUsd: 0.1,
      costThresholdUsd: 1.0,
      weights: {
        score: 0.7,
        time: 0.2,
        cost: 0.1,
      },
    },
    flags: {
      selfImproveNodes: true,
      addTools: true,
      analyzeWorkflow: true,
      removeNodes: true,
      editNodes: true,
      maxRetriesForWorkflowRepair: 3,
      useSummariesForImprovement: true,
      improvementType: "judge" as const,
      operatorsWithFeedback: false,
    },
  },
  verification: {
    allowCycles: false,
    enableOutputValidation: true,
  },
  context: {
    maxFilesPerWorkflow: 10,
    enforceFileLimit: false,
  },
  evolution: {
    mode: "GP" as const,
    generationAmount: 5,
    initialPopulationMethod: "random" as const,
    initialPopulationFile: null,
    GP: {
      populationSize: 10,
      maxGenerations: 5,
      selectionPressure: 2,
      crossoverRate: 0.8,
      mutationRate: 0.2,
    },
  },
  ingestion: {
    taskLimit: 100,
  },
  limits: {
    maxCostUsdPerRun: 10.0,
    enableSpendingLimits: true,
    rateWindowMs: 60000,
    maxRequestsPerWindow: 100,
    maxConcurrentWorkflows: 10,
    maxConcurrentAIRequests: 5,
    enableStallGuard: false,
    enableParallelLimit: false,
  },
  ...overrides,
})

export const mockRuntimeConstantsForGP = (overrides?: any) => {
  const config = createMockFullFlowRuntimeConfig(overrides)

  vi.mock("@example/settings/constants.client", () => ({
    CONFIG: config,
  }))

  return config
}

// ====== LOGGER MOCKS ======

export const mockLogger = () => ({
  log: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
})

export const getMockLogger = mockLogger

// ====== MAIN TEST MOCKS ======

export const mockCulturalEvolutionMain = vi.fn()
export const mockDisplayResults = vi.fn()
export const mockGetWorkflowSetup = vi.fn()
export const mockSaveWorkflowConfig = vi.fn()

// ====== ADDITIONAL MISSING EXPORTS ======

export const setupGPTestMocks = () => {
  // Setup GP test environment
}

export const createMockEvolutionConfig = createMockEvolutionSettings
export const createMockFlowEvolutionConfig = (): FlowEvolutionConfig => ({
  mode: "GP" as const,
  generationAmount: 5,
  initialPopulationMethod: "random" as const,
  initialPopulationFile: null,
  GP: {
    verbose: false,
    maximumTimeMinutes: 60,
    offspringCount: 4,
    numberOfParentsCreatingOffspring: 2,
    populationSize: 10,
    generations: 5,
    tournamentSize: 2,
    crossoverRate: 0.8,
    mutationRate: 0.2,
    eliteSize: 2,
    maxEvaluationsPerHour: 100,
    maxCostUSD: 10.0,
    evaluationDataset: "test-dataset",
    baselineComparison: false,
    mutationParams: {
      mutationInstructions: "test mutation instructions",
    },
    noveltyWeight: 0.5,
    immigrantRate: 0.1,
    immigrantInterval: 5,
  },
})
