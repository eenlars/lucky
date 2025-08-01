// shared mock constants and default values for tests
export const TEST_CONSTANTS = {
  // common test IDs
  WORKFLOW_ID: "test-workflow-id",
  RUN_ID: "test-run-id",
  GENERATION_ID: "test-generation-id",
  GENOME_ID: "test-genome-id",
  NODE_ID: "test-node-id",
  INVOCATION_ID: "test-invocation-id",
  VERSION_ID: "test-version-id",

  // common test values
  COST_USD: 0.01,
  TIME_SECONDS: 10,
  FITNESS_SCORE: 0.8,
  ACCURACY_SCORE: 0.8,

  // common test strings
  SYSTEM_PROMPT: "test system prompt",
  DESCRIPTION: "test description",
  GOAL: "test goal",
  QUESTION: "test question",
  ANSWER: "test answer",
  EVALUATION: "test evaluation criteria",
  ERROR_MESSAGE: "test error message",

  // common test arrays
  EMPTY_ARRAY: [],
  EMPTY_OBJECT: {},

  // common test paths
  PATHS: {
    ROOT: "/test",
    APP: "/test/app",
    RUNTIME: "src/runtime",
    MEMORY: "src/runtime/logging_folder/memory",
    LOGGING: "src/runtime/logging_folder",
  },

  // common test timeouts
  TIMEOUTS: {
    FAST: 1000,
    NORMAL: 5000,
    SLOW: 10000,
  },

  // common test configs
  EVOLUTION_CONFIG: {
    POPULATION_SIZE: 5,
    GENERATIONS: 3,
    MAX_COST_USD: 1.0,
    ELITE_SIZE: 1,
    TOURNAMENT_SIZE: 2,
    CROSSOVER_RATE: 0.7,
    MAX_EVALUATIONS_PER_HOUR: 100,
  },

  // common tool execution context
  TOOL_CONTEXT: {
    WORKFLOW_INVOCATION_ID: "test-workflow-123",
    WORKFLOW_FILES: [],
    EXPECTED_OUTPUT_TYPE: undefined,
  },

  // common database responses
  DATABASE: {
    SUCCESS_RESPONSE: { error: null },
    EMPTY_RESPONSE: { data: [], error: null },
    ERROR_RESPONSE: { data: null, error: { message: "test error" } },
  },

  // common AI response formats
  AI_RESPONSE: {
    SUCCESS: {
      success: true,
      data: null,
      error: null,
      usdCost: 0.01,
      debug_input: [],
    },
    ERROR: {
      success: false,
      data: null,
      error: "test error",
      usdCost: 0,
      debug_input: [],
    },
  },

  // common fitness score structure
  FITNESS_SCORE_STRUCTURE: {
    score: 0.8,
    totalCostUsd: 0.01,
    totalTimeSeconds: 10,
    accuracy: 0.8,
    novelty: 0.8,
    workflowVersionId: "test-genome-id",
    valid: true,
    evaluatedAt: new Date().toISOString(),
  },

  // common workflow config structure
  WORKFLOW_CONFIG: {
    nodes: [
      {
        nodeId: "node1",
        description: "test node",
        systemPrompt: "test system prompt",
        modelName: "openai/gpt-4.1-mini",
        mcpTools: [],
        codeTools: [],
        handOffs: [],
        memory: {},
      },
    ],
    entryNodeId: "node1",
  },

  // common evaluation input structures
  EVALUATION_INPUT: {
    TEXT: {
      type: "text" as const,
      question: "test question",
      answer: "test answer",
      goal: "test goal",
      workflowId: "test-workflow-id",
    },
    CSV: {
      type: "csv" as const,
      evaluation: "test evaluation criteria",
      goal: "test goal",
      workflowId: "test-workflow-id",
    },
  },

  // common runtime config mock
  RUNTIME_CONFIG: {
    models: {
      inactive: new Set(["openai/gpt-4.1"]),
    },
    coordinationType: "sequential",
    newNodeProbability: 0.7,
    logging: {
      level: "info",
      override: {
        Database: true,
        GP: true,
      },
    },
    workflow: {
      maxNodeInvocations: 14,
    },
    tools: {
      inactive: new Set([]),
      uniqueToolsPerAgent: false,
      uniqueToolSetsPerAgent: false,
      maxToolsPerAgent: 6,
      maxStepsVercel: 1,
    },
    improvement: {
      fitness: {
        timeThresholdSeconds: 70,
        baselineTimeSeconds: 5,
        baselineCostUsd: 0.001,
        costThresholdUsd: 0.003,
        weights: { score: 0.7, time: 0.2, cost: 0.1 },
      },
      flags: {
        selfImproveNodes: false,
        addTools: true,
        analyzeWorkflow: true,
        removeNodes: true,
        editNodes: true,
        maxRetriesForWorkflowRepair: 4,
      },
    },
    verification: {
      enableCycles: true,
    },
    context: {
      maxFilesPerWorkflow: 1,
      enforceFileLimit: true,
    },
    evolution: {
      mode: "cultural",
      culturalIterations: 1,
      GP: {
        generations: 1,
        populationSize: 1,
        verbose: false,
      },
    },
  },
} as const
