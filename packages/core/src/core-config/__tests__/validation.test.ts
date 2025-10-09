/**
 * Tests for CoreConfig validation using runtime contract
 */

import { validateRuntimeConfig } from "@lucky/contracts/runtime"
import { describe, expect, it } from "vitest"
import { getCoreConfig, initCoreConfig } from "../coreConfig"
import { toRuntimeContract } from "../validation"

describe("CoreConfig Validation", () => {
  it("should validate default config", () => {
    // This should not throw
    expect(() => {
      initCoreConfig()
      const config = getCoreConfig()
      const runtimeConfig = toRuntimeContract(config)
      validateRuntimeConfig(runtimeConfig)
    }).not.toThrow()
  })

  it("should reject invalid maxStepsVercel", () => {
    expect(() => {
      initCoreConfig({
        tools: {
          inactive: [],
          uniqueToolsPerAgent: false,
          uniqueToolSetsPerAgent: false,
          maxToolsPerAgent: 3,
          maxStepsVercel: -1, // Invalid!
          defaultTools: [],
          autoSelectTools: true,
          usePrepareStepStrategy: false,
          experimentalMultiStepLoop: true,
          showParameterSchemas: true,
          experimentalMultiStepLoopMaxRounds: 6,
        },
      })
    }).toThrow()
  })

  it("should reject invalid coordinationType", () => {
    expect(() => {
      initCoreConfig({
        coordinationType: "invalid" as any,
      })
    }).toThrow()
  })

  it("should reject invalid log level", () => {
    expect(() => {
      initCoreConfig({
        logging: {
          level: "verbose" as any,
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
      })
    }).toThrow()
  })

  it("should accept valid config override", () => {
    expect(() => {
      initCoreConfig({
        tools: {
          inactive: ["tool1", "tool2"],
          uniqueToolsPerAgent: true,
          uniqueToolSetsPerAgent: false,
          maxToolsPerAgent: 5,
          maxStepsVercel: 20,
          defaultTools: ["defaultTool1"],
          autoSelectTools: false,
          usePrepareStepStrategy: true,
          experimentalMultiStepLoop: false,
          showParameterSchemas: false,
          experimentalMultiStepLoopMaxRounds: 10,
        },
      })
    }).not.toThrow()
  })

  it("should validate toRuntimeContract conversion", () => {
    initCoreConfig({
      tools: {
        inactive: ["tool1", "tool2"],
        uniqueToolsPerAgent: false,
        uniqueToolSetsPerAgent: false,
        maxToolsPerAgent: 3,
        maxStepsVercel: 10,
        defaultTools: ["defaultTool"],
        autoSelectTools: true,
        usePrepareStepStrategy: false,
        experimentalMultiStepLoop: true,
        showParameterSchemas: true,
        experimentalMultiStepLoopMaxRounds: 6,
      },
    })

    const config = getCoreConfig()
    const runtimeConfig = toRuntimeContract(config)

    // Verify Sets are converted to Arrays
    expect(Array.isArray(runtimeConfig.tools.inactive)).toBe(true)
    expect(Array.isArray(runtimeConfig.tools.defaultTools)).toBe(true)

    // Verify conversion preserves values
    expect(runtimeConfig.tools.inactive).toContain("tool1")
    expect(runtimeConfig.tools.inactive).toContain("tool2")
    expect(runtimeConfig.tools.defaultTools).toContain("defaultTool")

    // Should validate successfully
    expect(() => validateRuntimeConfig(runtimeConfig)).not.toThrow()
  })

  it("should reject fitness weight outside 0-1 range", () => {
    expect(() => {
      initCoreConfig({
        improvement: {
          fitness: {
            timeThresholdSeconds: 300,
            baselineTimeSeconds: 60,
            baselineCostUsd: 0.005,
            costThresholdUsd: 0.01,
            weights: {
              score: 1.5, // Invalid: > 1
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
      })
    }).toThrow()
  })

  it("should accept both hierarchical and sequential coordination", () => {
    expect(() => {
      initCoreConfig({ coordinationType: "sequential" })
      initCoreConfig({ coordinationType: "hierarchical" })
    }).not.toThrow()
  })

  it("should accept both judge and unified improvement types", () => {
    expect(() => {
      initCoreConfig({
        improvement: {
          fitness: {
            timeThresholdSeconds: 300,
            baselineTimeSeconds: 60,
            baselineCostUsd: 0.005,
            costThresholdUsd: 0.01,
            weights: { score: 0.7, time: 0.2, cost: 0.1 },
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
      })

      initCoreConfig({
        improvement: {
          fitness: {
            timeThresholdSeconds: 300,
            baselineTimeSeconds: 60,
            baselineCostUsd: 0.005,
            costThresholdUsd: 0.01,
            weights: { score: 0.7, time: 0.2, cost: 0.1 },
          },
          flags: {
            selfImproveNodes: false,
            addTools: true,
            analyzeWorkflow: true,
            removeNodes: true,
            editNodes: true,
            maxRetriesForWorkflowRepair: 3,
            useSummariesForImprovement: true,
            improvementType: "unified",
            operatorsWithFeedback: true,
          },
        },
      })
    }).not.toThrow()
  })
})
