/**
 * Test configuration mocks for @core/core-config/compat
 * Provides properly typed CONFIG objects for testing with validation
 */

import { toRuntimeContract } from "@core/core-config/validation"
import type { FlowRuntimeConfig } from "@core/types"
import { validateRuntimeConfig } from "@lucky/shared/contracts/runtime"

/**
 * Create a complete mock CONFIG for verbose mode testing
 */
export function createMockConfigVerbose(): FlowRuntimeConfig {
  return {
    coordinationType: "sequential",
    newNodeProbability: 0.7,
    logging: {
      level: "info",
      override: {
        API: false,
        GP: false,
        Database: false,
        Tools: false,
        Summary: false,
        InvocationPipeline: false,
        Messaging: false,
        Improvement: false,
        ValidationBeforeHandoff: false,
        Setup: false,
      },
    },
    workflow: {
      parallelExecution: false,
      asyncExecution: false,
      maxTotalNodeInvocations: 14,
      maxPerNodeInvocations: 14,
      maxNodes: 20,
      handoffContent: "full",
      prepareProblem: true,
      prepareProblemMethod: "ai",
      prepareProblemWorkflowVersionId: "",
    },
    tools: {
      inactive: [],
      defaultTools: [],
      uniqueToolsPerAgent: false,
      uniqueToolSetsPerAgent: false,
      maxToolsPerAgent: 3,
      maxStepsVercel: 10,
      autoSelectTools: true,
      usePrepareStepStrategy: false,
      experimentalMultiStepLoop: true,
      showParameterSchemas: true,
      experimentalMultiStepLoopMaxRounds: 6,
    },
    models: {
      inactive: [],
      provider: "openrouter",
    },
    improvement: {
      fitness: {
        timeThresholdSeconds: 300,
        baselineTimeSeconds: 60,
        baselineCostUsd: 0.005,
        costThresholdUsd: 0.01,
        weights: {
          score: 0.7,
          time: 0.2,
          cost: 0.1,
        },
      },
      flags: {
        selfImproveNodes: false,
        addTools: true,
        analyzeWorkflow: true,
        removeNodes: true,
        editNodes: true,
        maxRetriesForWorkflowRepair: 3,
        useSummariesForImprovement: true,
        improvementType: "judge",
        operatorsWithFeedback: true,
      },
    },
    verification: {
      allowCycles: false,
      enableOutputValidation: false,
    },
    context: {
      maxFilesPerWorkflow: 1,
      enforceFileLimit: true,
    },
    evolution: {
      iterativeIterations: 30,
      GP: {
        generations: 3,
        populationSize: 5,
        verbose: true,
        initialPopulationMethod: "random",
        initialPopulationFile: null,
        maximumTimeMinutes: 700,
      },
    },
    ingestion: {
      taskLimit: 100,
    },
    limits: {
      maxConcurrentWorkflows: 2,
      maxConcurrentAIRequests: 30,
      maxCostUsdPerRun: 30.0,
      enableSpendingLimits: true,
      maxRequestsPerWindow: 300,
      rateWindowMs: 10000,
      enableStallGuard: true,
      enableParallelLimit: true,
    },
  }
}

/**
 * Create a complete mock CONFIG for standard testing
 */
export function createMockConfigStandard(): FlowRuntimeConfig {
  const config = createMockConfigVerbose()
  return {
    ...config,
    evolution: {
      ...config.evolution,
      GP: {
        ...config.evolution.GP,
        verbose: false,
      },
    },
  }
}

/**
 * Create mock PATHS for testing
 */
export function createMockPaths() {
  return {
    root: "/test",
    app: "/test/app",
    runtime: "/test/runtime",
    codeTools: "/test/codeTools",
    setupFile: "/test/setup.txt",
    improver: "/test/improver.json",
    node: {
      logging: "/test/logging",
      memory: {
        root: "/test/memory",
        workfiles: "/test/memory/workfiles",
      },
      error: "/test/error",
    },
  }
}

/**
 * Create mock MODELS for testing
 */
export function createMockModels() {
  return {
    default: "google/gemini-2.5-flash-lite",
    summary: "google/gemini-2.5-flash-lite",
    nano: "google/gemini-2.5-flash-lite",
    low: "google/gemini-2.5-flash-lite",
    medium: "openai/gpt-4.1-mini",
    high: "openai/gpt-4.1",
    fitness: "openai/gpt-4.1-mini",
    reasoning: "openai/gpt-4.1-mini",
    fallback: "switchpoint/router",
  }
}

/**
 * Validate a FlowRuntimeConfig against the runtime contract.
 * Useful for testing that mock configs conform to the schema.
 *
 * @throws ZodError if config is invalid
 */
export function validateMockConfig(config: FlowRuntimeConfig): void {
  // Convert to runtime contract format (excluding evolution and ingestion)
  const runtimeConfig = {
    coordinationType: config.coordinationType,
    newNodeProbability: config.newNodeProbability,
    models: config.models,
    logging: config.logging,
    tools: config.tools,
    workflow: config.workflow,
    improvement: config.improvement,
    limits: config.limits,
    context: config.context,
    verification: config.verification,
    persistence: {
      useMockBackend: true,
      defaultBackend: "memory" as const,
    },
  }

  validateRuntimeConfig(runtimeConfig)
}
