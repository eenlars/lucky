/**
 * Client-safe constants that can be used in browser environments.
 * This file contains only the constants that don't require Node.js modules.
 */

import type {
  FlowCoordinationType,
  FlowRuntimeConfig,
} from "@core/utils/config/runtimeConfig.types"
import { EVOLUTION_CONFIG } from "@settings/evolution"
import { MODEL_CONFIG, MODELS } from "./models"
import { TOOL_CONFIG, TOOL_IMPROVEMENT_CONFIG } from "./tools"

// Re-export MODELS for compatibility
export { MODELS }

export const CONFIG = {
  coordinationType: "sequential" as FlowCoordinationType,
  newNodeProbability: 0.7,

  logging: {
    Setup: false,
    Tools: false,
    Memory: false,
    InvocationPipeline: false,
    Messaging: false,
    ValidationBeforeHandoff: false,
    Improvement: true,
    Summary: false,
    Database: false,
    GP: false,
    API: false,
  },

  workflow: {
    parallelExecution: true,
    asyncExecution: true,
    maxNodeInvocations: 20,
    maxNodes: 20,
    handoffContent: "full" as "summary" | "full",
    prepareProblem: true,
    prepareProblemMethod: "ai" as "ai" | "workflow",
    prepareProblemWorkflowVersionId: "a1373554",
  },

  tools: {
    ...TOOL_CONFIG,
  },

  models: {
    ...MODEL_CONFIG,
  },

  improvement: {
    fitness: {
      timeThresholdSeconds: 300, // increased from 90
      baselineTimeSeconds: 60, // increased from 6
      baselineCostUsd: 0.005, // increased from 0.001
      costThresholdUsd: 0.01, // increased from 0.003
      weights: { score: 0.7, time: 0.2, cost: 0.1 },
    },
    flags: {
      selfImproveNodes: false,
      ...TOOL_IMPROVEMENT_CONFIG,
      analyzeWorkflow: true,
      removeNodes: true,
      editNodes: true,
      maxRetriesForWorkflowRepair: 3,
      useSummariesForImprovement: true, // use ai-generated summaries instead of raw transcripts
      improvementType: "judge" as "judge" | "unified",
      operatorsWithFeedback: true,
    },
  },

  verification: {
    allowCycles: true,
    enableOutputValidation: false,
  },
  context: {
    maxFilesPerWorkflow: 1,
    enforceFileLimit: true,
  },
  evolution: {
    ...EVOLUTION_CONFIG,
  },
  ingestion: {
    taskLimit: 100, // Max number of tasks to load from benchmarks (SWE-bench, GAIA)
  },
  limits: {
    maxConcurrentWorkflows: 2, // Max concurrent WorkflowIO executions to respect rate limits
    maxConcurrentAIRequests: 30, // Max concurrent requests to openrouter to respect rate limits
    maxCostUsdPerRun: 30.0, // max spend per evolution run
    enableSpendingLimits: true,
    rateWindowMs: 10000, // 10 seconds
    //likely bug: maxRequestsPerWindow (300) is less than OpenRouter's actual limit (670) - could be overly restrictive
    maxRequestsPerWindow: 300, // openrouter: 670 requests per 10 seconds
    enableStallGuard: true,
    enableParallelLimit: true,
  },
} as const satisfies FlowRuntimeConfig
