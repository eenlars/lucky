/**
 * Default configuration for standalone core module.
 * All paths are relative to process.cwd() by default.
 * SERVER-ONLY - do not import from client code.
 */

import path from "node:path"
import type { CoreConfig } from "./types"

/**
 * Creates default core configuration with safe server defaults.
 * Uses ./.core-data as the root directory for all file operations.
 */
export function createDefaultCoreConfig(): CoreConfig {
  const cwd = process.cwd()
  const coreDataRoot = path.join(cwd, ".core-data")
  const loggingDir = path.join(coreDataRoot, "logs")
  const memoryRoot = path.join(coreDataRoot, "memory")

  /**
   * Find examples directory by walking up from cwd.
   */
  function findExamplesDir(): string {
    const fallbackPath = path.resolve(cwd, "../examples")

    // Always use fallback in this simplified version
    // Actual filesystem lookup not needed for default config
    return fallbackPath
  }

  const examplesRoot = findExamplesDir()
  const codeToolsPath = path.join(examplesRoot, "code_tools")

  return {
    coordinationType: "sequential",
    newNodeProbability: 0.7,

    paths: {
      root: coreDataRoot,
      app: path.join(coreDataRoot, "app"),
      runtime: examplesRoot,
      codeTools: codeToolsPath,
      setupFile: path.join(coreDataRoot, "setup", "setupfile.json"),
      improver: path.join(coreDataRoot, "setup", "improve.json"),
      node: {
        logging: loggingDir,
        memory: {
          root: memoryRoot,
          workfiles: path.join(memoryRoot, "workfiles"),
        },
        error: path.join(loggingDir, "error"),
      },
    },

    models: {
      provider: "openrouter",
      inactive: ["moonshotai/kimi-k2", "x-ai/grok-4", "qwen/qwq-32b:free"],
      defaults: {
        summary: "google/gemini-2.5-flash-lite",
        nano: "google/gemini-2.5-flash-lite",
        low: "google/gemini-2.5-flash-lite",
        medium: "openai/gpt-4.1-mini",
        high: "openai/gpt-4.1",
        default: "openai/gpt-4.1-nano",
        fitness: "openai/gpt-4.1-mini",
        reasoning: "openai/gpt-4.1-mini",
        fallback: "switchpoint/router",
      },
    },

    tools: {
      inactive: [],
      uniqueToolsPerAgent: false,
      uniqueToolSetsPerAgent: false,
      maxToolsPerAgent: 3,
      maxStepsVercel: 10,
      defaultTools: [],
      autoSelectTools: true,
      usePrepareStepStrategy: false,
      experimentalMultiStepLoop: true,
      showParameterSchemas: true,
      experimentalMultiStepLoopMaxRounds: 6,
    },

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
        Improvement: true,
        ValidationBeforeHandoff: false,
        Setup: false,
      },
    },

    workflow: {
      maxTotalNodeInvocations: 14,
      maxPerNodeInvocations: 14,
      maxNodes: 20,
      handoffContent: "full",
      prepareProblem: true,
      prepareProblemMethod: "ai",
      prepareProblemWorkflowVersionId: "",
      parallelExecution: false,
    },

    evolution: {
      iterativeIterations: 30,
      GP: {
        generations: 3,
        populationSize: 4,
        verbose: false,
        initialPopulationMethod: "random",
        initialPopulationFile: null,
        maximumTimeMinutes: 700,
      },
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
        maxRetriesForWorkflowRepair: 4,
        useSummariesForImprovement: true,
        improvementType: "judge",
        operatorsWithFeedback: true,
      },
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

    context: {
      maxFilesPerWorkflow: 1,
      enforceFileLimit: true,
    },

    verification: {
      allowCycles: true,
      enableOutputValidation: false,
    },

    persistence: {
      useMockBackend: process.env.USE_MOCK_PERSISTENCE === "true",
      defaultBackend: process.env.USE_MOCK_PERSISTENCE === "true" ? "memory" : "supabase",
    },
  }
}

/**
 * Deep merge two objects, with override taking precedence.
 * Arrays are replaced entirely, not merged.
 */
export function mergeConfig<T extends Record<string, any>>(base: T, override: Partial<T>): T {
  const result: any = { ...base }

  for (const key in override) {
    const overrideValue = override[key]
    const baseValue = base[key]

    if (overrideValue === undefined) {
      continue
    }

    // Replace arrays entirely (don't merge)
    if (Array.isArray(overrideValue)) {
      result[key] = overrideValue
      continue
    }

    // Deep merge objects (but not arrays or null)
    if (typeof overrideValue === "object" && overrideValue !== null) {
      result[key] = mergeConfig(baseValue || {}, overrideValue as any)
      continue
    }

    // Replace primitives
    result[key] = overrideValue
  }

  return result as T
}
