// core test utilities and mocks - consolidated mock file
import { getDefaultModels } from "@core/core-config/compat"
import type { FitnessOfWorkflow } from "@core/evaluation/calculate-fitness/fitness.types"
import type { EvolutionEvaluator } from "@core/evaluation/evaluators/EvolutionEvaluator"
import type { EvolutionSettings } from "@core/improvement/gp/resources/evolution-types"
import type { GenomeEvaluationResults, WorkflowGenome } from "@core/improvement/gp/resources/gp.types"
import type { WorkflowFile } from "@core/tools/context/contextStore.types"
import type { FlowPathsConfig, FlowRuntimeConfig } from "@core/types"
import type { RS } from "@core/utils/types"
import type {
  EvaluationCSV,
  EvaluationInput,
  EvaluationText,
  WorkflowIO,
} from "@core/workflow/ingestion/ingestion.types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { Workflow } from "@core/workflow/Workflow"
import { vi } from "vitest"

// CLI and system-level mocks
export const mockProcessExit = vi.fn()
export const mockConsoleLog = vi.fn()
export const mockConsoleError = vi.fn()
export const mockDisplayResults = vi.fn()
export const mockSaveWorkflowConfig = vi.fn()
export const mockGetWorkflowSetup = vi.fn()

// evolution engine mocks
export const mockEvolutionEngineRun = vi.fn()
export const mockEvolutionEngineInit = vi.fn()

// iterative evolution mocks
export const mockIterativeEvolutionMain = vi.fn()

// supabase client mocks
export const mockSupabaseInsert = vi.fn()
export const mockSupabaseUpdate = vi.fn()
export const mockSupabaseSelect = vi.fn()
export const mockSupabaseFrom = vi.fn()

// mock instances for runtime constants
const mockRunServiceInstance = {
  createRun: vi.fn(),
  createGeneration: vi.fn(),
  completeGeneration: vi.fn(),
  completeRun: vi.fn(),
  getCurrentRunId: vi.fn(),
  getCurrentGenerationId: vi.fn(),
  getRunId: vi.fn(),
  getGenerationId: vi.fn(),
  getLastCompletedGeneration: vi.fn(),
  setRunId: vi.fn(),
  setGenerationId: vi.fn(),
  generationExists: vi.fn(),
  getGenerationIdByNumber: vi.fn(),
}

const mockVerificationCacheInstance = {
  verifyWithCache: vi.fn(),
  clearCache: vi.fn(),
}

const mockSupabaseInstance = {
  from: vi.fn().mockReturnValue({
    insert: vi.fn().mockResolvedValue({ error: null }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    select: vi.fn().mockResolvedValue({ data: [], error: null }),
    update: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockResolvedValue({ error: null }),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
}

const mockLoggerInstance = {
  log: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
}

const mockGenomeInstance = {
  // State properties
  isEvaluated: false,

  // Core genome methods
  getWorkflowVersionId: vi.fn(),
  getWorkflowConfig: vi.fn(),
  getRawGenome: vi.fn(),
  hash: vi.fn(),

  // Fitness methods
  getFitness: vi.fn(),
  getFitnessScore: vi.fn(),
  setFitness: vi.fn(),
  setFitnessAndFeedback: vi.fn(),

  // Evolution context methods
  getGenerationNumber: vi.fn(),
  getParentIds: vi.fn(),
  getEvolutionContext: vi.fn(),
  reset: vi.fn(),

  // Workflow methods inherited from Workflow class
  getEvaluationInput: vi.fn(),
  getConfig: vi.fn(),
  getWorkflowId: vi.fn(),
  getFeedback: vi.fn(),
  getGoal: vi.fn(),
  addCost: vi.fn(),

  // Database methods
  saveToDatabase: vi.fn().mockResolvedValue({
    workflowVersionId: "test-version-id",
    workflowInvocationId: "test-invocation-id",
  }),
}

const mockPopulationInstance = {
  // Core population methods
  getGenomes: vi.fn(),
  getValidGenomes: vi.fn(),
  getUnevaluated: vi.fn(),
  getEvaluated: vi.fn(),
  getBest: vi.fn(),
  getWorst: vi.fn(),
  getTop: vi.fn(),
  size: vi.fn(),

  // Generation management
  getGenerationId: vi.fn(),
  getGenerationNumber: vi.fn(),
  incrementGenerationNumber: vi.fn(),

  // Population manipulation
  setPopulation: vi.fn(),
  addGenome: vi.fn(),
  removeGenome: vi.fn(),
  removeUnevaluated: vi.fn().mockResolvedValue(undefined),
  resetGenomes: vi.fn(),
  clear: vi.fn(),

  // Evolution methods
  initialize: vi.fn().mockResolvedValue(undefined),
  generateRandomGenomes: vi.fn().mockResolvedValue([]),
  initializePopulationHelper: vi.fn().mockResolvedValue(undefined),
  initializePreparedPopulation: vi.fn().mockResolvedValue(undefined),

  // Analysis methods
  getStats: vi.fn(),
  findSimilarGenomes: vi.fn(),
  pruneSimilar: vi.fn(),

  // Service access
  getRunService: vi.fn(),

  // Legacy aliases for backward compatibility
  getFittestGenomes: vi.fn(),
  getBestGenome: vi.fn(),
  reset: vi.fn(),
}

const mockEvaluatorInstance = {
  evaluate: vi.fn(),
}

// GP module mocks
export const mockAIRequest = vi.fn()
export const mockGenerateSingleVariation = vi.fn()
export const mockConvertSimpleToFull = vi.fn()
export const mockVerifyWorkflowConfigStrict = vi.fn()
export const mockRegisterWorkflowInDatabase = vi.fn()

// Export individual mock instances for easier access
export const getMockRunService = () => mockRunServiceInstance
export const getMockVerificationCache = () => mockVerificationCacheInstance
export const getMockSupabase = () => mockSupabaseInstance
export const getMockLogger = () => mockLoggerInstance
export const getMockGenome = () => mockGenomeInstance
export const getMockPopulation = () => mockPopulationInstance
export const getMockEvaluator = () => mockEvaluatorInstance

// test fixtures
export const createMockCliArgs = (overrides = {}): string[] => [
  "node",
  "main.js",
  ...Object.entries(overrides).flatMap(([key, value]) =>
    key.startsWith("--") ? [key, String(value)] : [`--${key}`, String(value)],
  ),
]

export const createMockEvolutionSettings = (overrides = {}): EvolutionSettings => ({
  mode: "GP",
  mutationRate: 0.1,
  populationSize: 5,
  generations: 3,
  maxCostUSD: 1.0,
  eliteSize: 1,
  tournamentSize: 2,
  crossoverRate: 0.7,
  mutationParams: {
    mutationInstructions: "test mutation",
  },
  maxEvaluationsPerHour: 100,
  offspringCount: 5,
  numberOfParentsCreatingOffspring: 2,
  evaluationDataset: "test",
  baselineComparison: false,
  ...overrides,
})

export const createMockEvaluationInput = (): EvaluationInput => ({
  type: "text",
  goal: "test evolution goal",
  question: "test question",
  answer: "test evaluation criteria",
  workflowId: "test-workflow-id",
})

export const createMockWorkflowIO = (): WorkflowIO => ({
  workflowInput: "test workflow input",
  workflowOutput: {
    output: "test expected output",
  },
})

export const createMockSupabaseClient = (): any => ({
  from: mockSupabaseFrom.mockReturnValue({
    insert: mockSupabaseInsert.mockReturnValue({
      select: mockSupabaseSelect.mockResolvedValue({
        data: [{ id: "test-id" }],
        error: null,
      }),
    }),
    update: mockSupabaseUpdate.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: mockSupabaseSelect.mockResolvedValue({
          data: [{ id: "test-id" }],
          error: null,
        }),
      }),
    }),
    select: mockSupabaseSelect.mockResolvedValue({
      data: [],
      error: null,
    }),
  }),
})

export const createMockEvolutionEngine = (): any => ({
  run: mockEvolutionEngineRun.mockResolvedValue({
    bestGenome: {
      getWorkflowVersionId: () => "best-genome",
      fitness: { score: 0.9 },
    },
    bestScore: { score: 0.9, valid: true },
    finalFitness: 0.9,
    totalCost: 0.1,
    generations: 3,
  }),
  initialize: mockEvolutionEngineInit.mockResolvedValue(undefined),
  getStats: vi.fn().mockReturnValue([]),
  getTotalCost: vi.fn().mockReturnValue(0.1),
})

export const createMockIterativeResult = (): any => ({
  results: [
    {
      iteration: 1,
      fitness: { score: 0.8 },
      cost: 0.05,
      transcript: "test iteration 1",
    },
    {
      iteration: 2,
      fitness: { score: 0.85 },
      cost: 0.06,
      transcript: "test iteration 2",
    },
  ],
  totalCost: 0.11,
  logFilePath: "/test/log/path",
})

// setup default mock implementations
export const setupCoreMocks = (): void => {
  // successful defaults for all operations
  mockGetWorkflowSetup.mockResolvedValue({
    expectedFormat: "test format",
    question: "test question",
  })

  mockSaveWorkflowConfig.mockResolvedValue(undefined)
  mockDisplayResults.mockReturnValue(undefined)

  mockIterativeEvolutionMain.mockResolvedValue(createMockIterativeResult())

  // supabase defaults
  mockSupabaseInsert.mockReturnValue({
    select: mockSupabaseSelect.mockResolvedValue({
      data: [{ id: "test-id", created_at: new Date().toISOString() }],
      error: null,
    }),
  })

  mockSupabaseUpdate.mockReturnValue({
    eq: vi.fn().mockReturnValue({
      select: mockSupabaseSelect.mockResolvedValue({
        data: [{ id: "test-id" }],
        error: null,
      }),
    }),
  })

  // GP module defaults
  mockAIRequest.mockResolvedValue({
    success: true,
    data: createMockWorkflowConfig(),
    error: null,
    usdCost: 0,
    debug_input: [],
  })

  mockGenerateSingleVariation.mockResolvedValue({
    workflow: createMockWorkflowConfig(),
    usdCost: 0.01,
  })

  mockConvertSimpleToFull.mockResolvedValue({
    config: createMockWorkflowConfig(),
    usdCost: 0.01,
  })

  mockVerifyWorkflowConfigStrict.mockResolvedValue(undefined)

  mockRegisterWorkflowInDatabase.mockResolvedValue({
    workflowInvocationId: "test-invocation-id",
  })
}

// reset all core mocks
export const resetCoreMocks = (): void => {
  vi.clearAllMocks()
  mockProcessExit.mockReset()
  mockConsoleLog.mockReset()
  mockConsoleError.mockReset()
  mockDisplayResults.mockReset()
  mockSaveWorkflowConfig.mockReset()
  mockGetWorkflowSetup.mockReset()
  mockEvolutionEngineRun.mockReset()
  mockEvolutionEngineInit.mockReset()
  mockIterativeEvolutionMain.mockReset()
  mockSupabaseInsert.mockReset()
  mockSupabaseUpdate.mockReset()
  mockSupabaseSelect.mockReset()
  mockSupabaseFrom.mockReset()
  mockAIRequest.mockReset()
  mockGenerateSingleVariation.mockReset()
  mockConvertSimpleToFull.mockReset()
  mockVerifyWorkflowConfigStrict.mockReset()
  mockRegisterWorkflowInDatabase.mockReset()
}

// common setup helper
export const setupCoreTest = (): void => {
  resetCoreMocks()
  setupCoreMocks()
}

// ====== WORKFLOW MOCK FACTORIES ======

export const createMockWorkflowFile = (filePath: string): WorkflowFile => {
  return {
    store: "supabase",
    filePath,
    summary: "test summary",
  }
}

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

export const createMockWorkflow = (options?: Parameters<typeof Workflow.create>[0]): Workflow => {
  if (!options) {
    options = {
      config: createMockWorkflowConfig(),
      evaluationInput: createMockEvaluationInput(),
      toolContext: createMockEvaluationInput().outputSchema
        ? {
            expectedOutputType: createMockEvaluationInput().outputSchema,
          }
        : undefined,
    }
  }
  return Workflow.create(options)
}

export const createMockWorkflowScore = (score = 0.8): FitnessOfWorkflow => ({
  score,
  accuracy: 80,
  totalCostUsd: 0.01,
  totalTimeSeconds: 1.5,
})

// ====== EVALUATION INPUT FACTORIES ======

export const createMockEvaluationInputText = (evaluation?: string): EvaluationText => ({
  type: "text",
  question: "test question",
  answer: evaluation || "test answer",
  goal: "test goal for evolution",
  workflowId: "test-workflow-id",
})

export const createMockEvaluationInputCSV = (evaluation?: string): EvaluationCSV => ({
  type: "csv",
  evaluation: `column:${evaluation || "test_column"}` as `column:${string}`,
  goal: "test goal for evolution",
  workflowId: "test-workflow-id",
})

export const createMockEvaluationInputGeneric = <T extends "text" | "csv">(
  type: T = "csv" as T,
  evaluation?: string,
): T extends "text" ? EvaluationText : EvaluationCSV => {
  if (type === "text") {
    return createMockEvaluationInputText(evaluation) as T extends "text" ? EvaluationText : EvaluationCSV
  }
  return createMockEvaluationInputCSV(evaluation) as T extends "text" ? EvaluationText : EvaluationCSV
}

// ====== GENOME AND EVOLUTION FACTORIES ======

export const createMockGenomeEvaluationResults = (score = 0.8): GenomeEvaluationResults => ({
  workflowVersionId: "test-version-id",
  hasBeenEvaluated: true,
  evaluatedAt: new Date().toISOString(),
  fitness: {
    score,
    accuracy: 80,
    totalCostUsd: 0.01,
    totalTimeSeconds: 1.5,
  },
  costOfEvaluation: 0.01,
  errors: [],
  feedback: "test feedback",
})

export const createMockWorkflowGenome = (generationNumber = 0, parentIds: string[] = []): WorkflowGenome => {
  return {
    ...createMockWorkflowConfig(),
    _evolutionContext: {
      runId: "test-run-id",
      generationId: "0",
      generationNumber,
    },
    parentWorkflowVersionIds: parentIds,
    createdAt: new Date().toISOString(),
    evaluationResults: undefined,
  }
}

export const createMockGenome = async (
  generationNumber = 0,
  parentIds: string[] = [],
  fitness?: FitnessOfWorkflow,
): Promise<any> => {
  const genomeData = createMockWorkflowGenome(generationNumber, parentIds)
  const mockFitness = fitness || createMockWorkflowScore(0)
  const mockId = `genome-${Math.random().toString(36).substring(2, 9)}`

  // Track evaluation state like real Genome
  let isEvaluated = false
  let currentFitness = mockFitness

  const mockInstance = {
    // Core genome data
    genome: genomeData,
    get isEvaluated() {
      return isEvaluated
    },
    set isEvaluated(value) {
      isEvaluated = value
    },

    // Fitness methods - behave like real Workflow class
    getFitness: vi.fn(() => currentFitness),
    getFitnessScore: vi.fn(() => {
      if (!currentFitness) throw new Error("Fitness not found for workflow")
      return currentFitness.score
    }),
    setFitness: vi.fn((newFitness: FitnessOfWorkflow) => {
      currentFitness = newFitness
      isEvaluated = true
    }),
    setFitnessAndFeedback: vi.fn(({ fitness, feedback }: { fitness: FitnessOfWorkflow; feedback: string | null }) => {
      currentFitness = fitness
      isEvaluated = true
    }),

    // Workflow interface methods
    getFeedback: vi.fn(() => (fitness ? "test feedback with good results" : "test feedback")),
    getGoal: vi.fn(() => "test goal"),
    getEvaluation: vi.fn(() => "test evaluation"),
    getConfig: vi.fn(() => createMockWorkflowConfig()),
    getRawGenome: vi.fn(() => genomeData),
    getWorkflowConfig: vi.fn(() => createMockWorkflowConfig()),
    getEvaluationInput: vi.fn(() => createMockEvaluationInputGeneric()),
    getWorkflowId: vi.fn(() => "test-workflow-id"),
    getWorkflowVersionId: vi.fn(() => `wf-version-${mockId}`),
    getEvolutionContext: vi.fn(() => ({
      runId: "test-run-id",
      generationId: "test-generation-id",
      generationNumber,
    })),
    getGenerationNumber: vi.fn(() => generationNumber),

    // Utility methods
    hash: vi.fn(() => `hash-${mockId}`),
    toString: vi.fn(() => JSON.stringify(createMockWorkflowConfig())),
    addCost: vi.fn(),
    reset: vi.fn(() => {
      isEvaluated = false
    }),

    // Database methods
    saveToDatabase: vi.fn().mockResolvedValue({
      workflowVersionId: "test-version-id",
      workflowInvocationId: "test-invocation-id",
    }),

    // Node methods
    getNodeIds: vi.fn(() => ["node1", "node2"]),
    nodes: createMockWorkflowConfig().nodes,

    // GP-specific methods
    setPrecomputedWorkflowData: vi.fn(),
  }

  return mockInstance
}

export const createMockEvaluator = (): EvolutionEvaluator => {
  const mockEvaluate = vi.fn().mockResolvedValue({
    success: true,
    data: {
      fitness: {
        workflowVersionId: "test-genome-id",
        valid: true,
        evaluatedAt: new Date().toISOString(),
        score: 0.8,
        totalCostUsd: 0.01,
        totalTimeSeconds: 10,
        accuracy: 0.8,
      },
      feedback: "test feedback",
    },
    usdCost: 0.01,
    error: undefined,
  })

  return {
    evaluate: mockEvaluate,
  }
}

export const createMockCrossoverParams = (overrides = {}): any => {
  const mockFitness = createMockWorkflowScore(0.8)
  const mockParent1 = {
    getWorkflowVersionId: vi.fn(() => "parent1-version"),
    toString: vi.fn(() => JSON.stringify(createMockWorkflowConfig())),
    getFeedback: vi.fn(() => "parent1 feedback"),
    getFitness: vi.fn(() => mockFitness),
    getGoal: vi.fn(() => "test goal"),
    getWorkflowConfig: vi.fn(() => createMockWorkflowConfig()),
    // memory APIs expected by MemoryPreservation
    getMemory: vi.fn(() => ({
      node1: {},
      node2: {},
    })),
    genome: { generationNumber: 0, parentIds: [] },
  }
  const mockParent2 = {
    getWorkflowVersionId: vi.fn(() => "parent2-version"),
    toString: vi.fn(() => JSON.stringify(createMockWorkflowConfig())),
    getFeedback: vi.fn(() => "parent2 feedback"),
    getFitness: vi.fn(() => mockFitness),
    getGoal: vi.fn(() => "test goal"),
    getWorkflowConfig: vi.fn(() => createMockWorkflowConfig()),
    getMemory: vi.fn(() => ({
      node1: {},
      node2: {},
    })),
    genome: { generation: 0, parentIds: [] },
  }

  return {
    parents: [mockParent1, mockParent2],
    generation: 1,
    evaluationInput: createMockEvaluationInputGeneric(),
    crossoverStrategy: "test crossover strategy",
    verbose: false,
    _evolutionContext: {
      runId: "test-run-id",
      generationId: "test-gen-id",
      generationNumber: 0,
    },
    ...overrides,
  }
}

// ====== RESPONSE HELPERS ======

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

// ====== RUNTIME CONFIGURATION FACTORIES ======
// Re-export from configMocks for centralized config management

export {
  createMockConfigStandard as createMockRuntimeConfig,
  createMockConfigVerbose as createMockRuntimeConfigVerbose,
  createMockPaths as createMockRuntimePaths,
  createMockModels as createMockRuntimeModels,
} from "./configMocks"

import { createMockConfigStandard, createMockConfigVerbose, createMockModels, createMockPaths } from "./configMocks"

/**
 * @deprecated Use configMocks directly
 * Create runtime constants for tests - returns full CONFIG, MODELS, PATHS
 */
export const createMockRuntimeConstants = () => ({
  CONFIG: createMockConfigStandard(),
  MODELS: createMockModels(),
  PATHS: createMockPaths(),
})

/**
 * @deprecated Use configMocks directly
 * Create full flow runtime config with tool overrides
 */
export const createMockFullFlowRuntimeConfig = (toolOverrides: Partial<FlowRuntimeConfig["tools"]> = {}) => {
  const config = createMockConfigStandard()
  return {
    CONFIG: {
      ...config,
      tools: {
        ...config.tools,
        ...toolOverrides,
      },
    },
    PATHS: createMockPaths(),
    MODELS: createMockModels(),
  }
}

/**
 * @deprecated No-op function - mock at test level
 * Placeholder for GP-specific runtime constants
 */
export const mockRuntimeConstantsForGP = (overrides?: { verbose?: boolean; [key: string]: unknown }) => {
  // No-op: vi.mock needs to be at top level
  // Tests should use vi.mock("@core/core-config/compat") directly
}

/**
 * @deprecated No-op function - mock at test level
 */
export const mockRuntimeConstantsForIterative = (overrides?: { [key: string]: unknown }) => {
  // No-op: vi.mock needs to be at top level
}

/**
 * @deprecated No-op function - mock at test level
 */
export const mockRuntimeConstantsForDatabase = (overrides?: { [key: string]: unknown }) => {
  // No-op: vi.mock needs to be at top level
}

/**
 * @deprecated No-op function - mock at test level
 */
export const mockRuntimeConstants = (overrides?: { [key: string]: unknown }) => {
  // No-op: vi.mock needs to be at top level
}

// ====== INDIVIDUAL MOCK HELPERS ======

export const mockRunService = () => {
  vi.mock("@core/improvement/gp/resources/RunService", () => ({
    RunService: vi.fn().mockImplementation(() => mockRunServiceInstance),
  }))
  return mockRunServiceInstance
}

export const mockVerificationCache = () => {
  vi.mock("@core/improvement/gp/resources/wrappers", () => ({
    VerificationCache: vi.fn().mockImplementation(() => mockVerificationCacheInstance),
    workflowConfigToGenome: vi.fn(),
  }))
  return mockVerificationCacheInstance
}

export const mockSupabaseClient = () => {
  vi.mock("@core/utils/clients/supabase/client", () => ({
    supabase: {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
        update: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockResolvedValue({ error: null }),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    },
  }))
  return mockSupabaseInstance
}

export const mockLogger = () => {
  vi.mock("@core/utils/logging/Logger", () => ({
    lgg: {
      log: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
  }))
  return mockLoggerInstance
}

export const mockGenomeClass = () => {
  vi.mock("@core/improvement/gp/Genome", () => {
    const GenomeMock = vi.fn().mockImplementation(() => mockGenomeInstance) as any
    GenomeMock.createRandom = vi.fn().mockResolvedValue({
      success: true,
      data: mockGenomeInstance,
      error: undefined,
    })
    GenomeMock.createPrepared = vi.fn().mockResolvedValue({
      success: true,
      data: mockGenomeInstance,
      error: undefined,
    })
    GenomeMock.createWorkflowVersion = vi.fn().mockResolvedValue({
      workflowVersionId: "test-version-id",
      workflowInvocationId: "test-invocation-id",
    })

    return {
      Genome: GenomeMock,
    }
  })
  return mockGenomeInstance
}

export const mockPopulationClass = () => {
  vi.mock("@core/improvement/gp/Population", () => ({
    Population: vi.fn().mockImplementation(() => mockPopulationInstance),
  }))
  return mockPopulationInstance
}

export const mockEvaluatorClass = () => {
  vi.mock("@core/evaluation/evaluators/EvolutionEvaluator", () => ({
    EvolutionEvaluator: vi.fn().mockImplementation(() => mockEvaluatorInstance),
  }))
  return mockEvaluatorInstance
}

export const mockSelectClass = () => {
  vi.mock("@core/improvement/gp/Select", () => ({
    Select: {
      createNextGeneration: vi.fn(),
      selectParents: vi.fn(),
      selectSurvivors: vi.fn(),
      tournamentSelection: vi.fn(),
      selectRandomParents: vi.fn(),
    },
  }))
}

export const mockCrossoverClass = () => {
  vi.mock("@core/improvement/gp/operators/Crossover", () => ({
    Crossover: {
      crossover: vi.fn(),
    },
  }))
}

export const mockMutationsClass = () => {
  vi.mock("@core/improvement/gp/operators/Mutations", () => ({
    Mutations: {
      mutateWorkflowGenome: vi.fn(),
    },
  }))
}

export const mockWorkflowGeneration = () => {
  vi.mock("@core/workflow/actions/generate/convert-simple-to-full/converter", () => ({
    convertSimpleToFull: vi.fn().mockResolvedValue({
      config: { nodes: [], entryNodeId: "test-node" },
      usdCost: 0.01,
    }),
  }))

  vi.mock("@core/workflow/actions/generate/gen-single-variation/generateSingleVariation", () => ({
    generateSingleVariation: vi.fn().mockResolvedValue({
      workflow: { nodes: [], entryNodeId: "test-node" },
      usdCost: 0.01,
    }),
  }))

  vi.mock("@core/workflow/actions/generate/gen-simple-workflow-idea/generateIdea", () => ({
    generateWorkflowIdea: vi.fn().mockResolvedValue({
      success: true,
      data: { workflow: "test workflow idea" },
      usdCost: 0.01,
    }),
  }))

  vi.mock("@core/workflow/actions/generate/gen-full-workflow/generateWorkflow", () => ({
    generateWorkflow: vi.fn().mockResolvedValue({
      workflows: [{ nodes: [], entryNodeId: "test-node" }],
      usdCost: 0.01,
    }),
  }))

  vi.mock("@core/validation/workflow/toolsVerification", () => ({
    verifyWorkflowConfigStrict: vi.fn().mockResolvedValue(undefined),
  }))

  vi.mock("@core/utils/persistence/workflow/registerWorkflow", () => ({
    registerWorkflowInDatabase: vi.fn().mockResolvedValue({
      workflowInvocationId: "test-invocation-id",
    }),
  }))

  vi.mock("@core/workflow/actions/generate/ideaToWorkflow", () => ({
    ideaToWorkflow: vi.fn().mockResolvedValue({
      success: true,
      data: { nodes: [], entryNodeId: "test-node" },
      usdCost: 0.01,
    }),
  }))

  vi.mock("@core/utils/validation/workflow", () => ({
    verifyWorkflowConfig: vi.fn().mockResolvedValue(undefined),
  }))
}

// ====== COMBINED SETUP HELPERS ======

export const setupGPTestMocks = (
  runtimeOverrides?: Parameters<typeof mockRuntimeConstantsForGP>[0],
  options?: { mockGenome?: boolean },
) => {
  const runService = mockRunService()
  const verificationCache = mockVerificationCache()
  const logger = mockLogger()
  const shouldMockGenome = options?.mockGenome ?? true
  const genome = shouldMockGenome ? mockGenomeClass() : getMockGenome()
  const population = mockPopulationClass()

  mockRuntimeConstantsForGP(runtimeOverrides)
  mockWorkflowGeneration()
  mockCrossoverClass()
  mockMutationsClass()

  // setup defaults
  runService.createRun.mockResolvedValue("test-run-id")
  runService.createGeneration.mockResolvedValue("test-gen-id")
  runService.completeGeneration.mockResolvedValue(undefined)
  runService.completeRun.mockResolvedValue(undefined)
  runService.getCurrentRunId.mockReturnValue("test-run-id")
  runService.getCurrentGenerationId.mockReturnValue("test-gen-id")
  runService.getRunId.mockReturnValue("test-run-id")
  runService.getGenerationId.mockReturnValue("test-gen-id")
  runService.getLastCompletedGeneration.mockResolvedValue(0)
  runService.generationExists.mockResolvedValue(false)
  runService.getGenerationIdByNumber.mockResolvedValue("test-gen-id")

  verificationCache.verifyWithCache.mockResolvedValue({ valid: true })
  verificationCache.clearCache.mockReturnValue(undefined)

  genome.getWorkflowVersionId.mockReturnValue("test-workflow-version-id")
  genome.getWorkflowConfig.mockReturnValue({
    nodes: [],
    entryNodeId: "test-node",
  })
  genome.getFitness.mockReturnValue({ score: 0.5, valid: true })
  genome.getRawGenome.mockReturnValue({ nodes: [], entryNodeId: "test-node" })
  genome.hash.mockReturnValue("test-hash")
  genome.getGenerationNumber.mockReturnValue(0)
  genome.getParentIds.mockReturnValue([])
  genome.getEvolutionContext.mockReturnValue({
    runId: "test-run-id",
    generationId: "test-gen-id",
    generationNumber: 0,
  })

  population.getGenomes.mockReturnValue([])
  population.getValidGenomes.mockReturnValue([])
  population.getFittestGenomes.mockReturnValue([])
  population.getUnevaluated.mockReturnValue([])
  population.getBest.mockReturnValue(null)
  population.size.mockReturnValue(0)
  population.getGenerationId.mockReturnValue(0)
  population.getBestGenome.mockReturnValue(null)
  population.getStats.mockReturnValue({
    avgFitness: 0,
    bestFitness: 0,
    worstFitness: 0,
    stdDev: 0,
  })

  return { runService, verificationCache, logger, genome, population }
}

export const setupDatabaseTestMocks = (runtimeOverrides?: Parameters<typeof mockRuntimeConstantsForDatabase>[0]) => {
  const supabase = mockSupabaseClient()
  const logger = mockLogger()
  mockRuntimeConstantsForDatabase(runtimeOverrides)
  return { supabase, logger }
}

export const setupToolTestMocks = (runtimeOverrides?: Parameters<typeof mockRuntimeConstants>[0]) => {
  const logger = mockLogger()
  mockRuntimeConstants(runtimeOverrides)
  return { logger }
}

// ====== LEGACY COMPATIBILITY ALIASES ======

// maintain backward compatibility with existing tests
export const createMockEvolutionConfig = createMockEvolutionSettings
export const resetAllMocks = resetCoreMocks
export const setupDefaultMocks = setupCoreMocks
export const setupGPTest = setupCoreTest
