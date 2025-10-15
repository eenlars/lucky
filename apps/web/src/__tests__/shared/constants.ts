/**
 * Shared mock constants and default values for tests
 * RE-EXPORTS from @lucky/shared/contracts/fixtures
 */

import { TEST_IDS, TEST_VALUES } from "@lucky/shared/contracts/fixtures"

// Re-export from contracts
export const TEST_CONSTANTS = {
  // Common test IDs (from contracts)
  ...TEST_IDS,

  // Common test values (from contracts)
  ...TEST_VALUES,

  // Common test arrays
  EMPTY_ARRAY: [],
  EMPTY_OBJECT: {},

  // Common test paths
  PATHS: {
    ROOT: "/test",
    APP: "/test/app",
    RUNTIME: "src/runtime",
    MEMORY: "src/examples/logging_folder/memory",
    LOGGING: "src/examples/logging_folder",
  },

  // Common test timeouts
  TIMEOUTS: {
    FAST: 1000,
    NORMAL: 5000,
    SLOW: 10000,
  },

  // Common test configs
  EVOLUTION_CONFIG: {
    POPULATION_SIZE: 5,
    GENERATIONS: 3,
    TOURNAMENT_SIZE: 3,
    ELITE_SIZE: 1,
  },

  // Common test models
  MODELS: {
    DEFAULT: "openrouter#google/gemini-2.5-flash-lite",
    HIGH: "openrouter#openai/gpt-4.1",
    MEDIUM: "openrouter#openai/gpt-4.1-mini",
    LOW: "openrouter#google/gemini-2.5-flash-lite",
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
        modelName: "openrouter#openai/gpt-4.1-mini",
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
      inactive: new Set(["openrouter#openai/gpt-4.1"]),
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
      maxTotalNodeInvocations: 14,
      maxPerNodeInvocations: 14,
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
      allowCycles: true,
      enableOutputValidation: false,
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

// Legacy exports for backward compatibility
export const WORKFLOW_ID = TEST_CONSTANTS.WORKFLOW_ID
export const RUN_ID = TEST_CONSTANTS.RUN_ID
export const GENERATION_ID = TEST_CONSTANTS.GENERATION_ID
export const GENOME_ID = TEST_CONSTANTS.GENOME_ID
export const NODE_ID = TEST_CONSTANTS.NODE_ID
