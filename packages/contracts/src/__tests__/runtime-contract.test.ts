/**
 * Tests to verify runtime contract schema matches actual usage
 */

import { describe, expect, it } from "vitest"
import { type RuntimeConfig, safeValidateRuntimeConfig, validateRuntimeConfig } from "../runtime"

describe("RuntimeConfig Schema Validation", () => {
  const validConfig: RuntimeConfig = {
    coordinationType: "sequential",
    newNodeProbability: 0.7,
    models: {
      provider: "openrouter",
      inactive: [],
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
      useMockBackend: false,
      defaultBackend: "supabase",
    },
  }

  it("should validate a complete valid config", () => {
    expect(() => validateRuntimeConfig(validConfig)).not.toThrow()
  })

  it("should safely validate a valid config", () => {
    const result = safeValidateRuntimeConfig(validConfig)
    expect(result.success).toBe(true)
  })

  it("should reject invalid coordinationType", () => {
    const invalid = { ...validConfig, coordinationType: "invalid" }
    const result = safeValidateRuntimeConfig(invalid)
    expect(result.success).toBe(false)
  })

  it("should reject negative maxToolsPerAgent", () => {
    const invalid = {
      ...validConfig,
      tools: { ...validConfig.tools, maxToolsPerAgent: -1 },
    }
    const result = safeValidateRuntimeConfig(invalid)
    expect(result.success).toBe(false)
  })

  it("should reject invalid log level", () => {
    const invalid = {
      ...validConfig,
      logging: { ...validConfig.logging, level: "verbose" as any },
    }
    const result = safeValidateRuntimeConfig(invalid)
    expect(result.success).toBe(false)
  })

  it("should reject invalid handoffContent", () => {
    const invalid = {
      ...validConfig,
      workflow: { ...validConfig.workflow, handoffContent: "partial" as any },
    }
    const result = safeValidateRuntimeConfig(invalid)
    expect(result.success).toBe(false)
  })

  it("should validate with optional maxPerNodeInvocations", () => {
    const withOptional = {
      ...validConfig,
      workflow: {
        ...validConfig.workflow,
        maxPerNodeInvocations: undefined,
      },
    }
    expect(() => validateRuntimeConfig(withOptional)).not.toThrow()
  })

  it("should accept valid fitness weights in 0-1 range", () => {
    // Note: The schema enforces 0-1 range but doesn't enforce sum = 1
    const withValidWeights = {
      ...validConfig,
      improvement: {
        ...validConfig.improvement,
        fitness: {
          ...validConfig.improvement.fitness,
          weights: { score: 0.8, time: 0.1, cost: 0.1 },
        },
      },
    }
    expect(() => validateRuntimeConfig(withValidWeights)).not.toThrow()
  })

  it("should reject weight values outside 0-1 range", () => {
    const invalid = {
      ...validConfig,
      improvement: {
        ...validConfig.improvement,
        fitness: {
          ...validConfig.improvement.fitness,
          weights: { score: 1.5, time: 0.2, cost: 0.1 },
        },
      },
    }
    const result = safeValidateRuntimeConfig(invalid)
    expect(result.success).toBe(false)
  })

  it("should reject invalid persistence backend", () => {
    const invalid = {
      ...validConfig,
      persistence: { ...validConfig.persistence, defaultBackend: "redis" as any },
    }
    const result = safeValidateRuntimeConfig(invalid)
    expect(result.success).toBe(false)
  })

  it("should reject zero or negative maxStepsVercel", () => {
    const invalid = {
      ...validConfig,
      tools: { ...validConfig.tools, maxStepsVercel: 0 },
    }
    const result = safeValidateRuntimeConfig(invalid)
    expect(result.success).toBe(false)
  })

  it("should validate hierarchical coordinationType", () => {
    const hierarchical = { ...validConfig, coordinationType: "hierarchical" as const }
    expect(() => validateRuntimeConfig(hierarchical)).not.toThrow()
  })

  it("should validate judge improvementType", () => {
    const judge = {
      ...validConfig,
      improvement: {
        ...validConfig.improvement,
        flags: { ...validConfig.improvement.flags, improvementType: "judge" as const },
      },
    }
    expect(() => validateRuntimeConfig(judge)).not.toThrow()
  })

  it("should validate unified improvementType", () => {
    const unified = {
      ...validConfig,
      improvement: {
        ...validConfig.improvement,
        flags: { ...validConfig.improvement.flags, improvementType: "unified" as const },
      },
    }
    expect(() => validateRuntimeConfig(unified)).not.toThrow()
  })
})
