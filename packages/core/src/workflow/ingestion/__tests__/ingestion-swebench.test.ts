import { SWEBenchLoader } from "@core/evaluation/benchmarks/swe/SWEBenchLoader"
import { IngestionLayer } from "@core/workflow/ingestion/IngestionLayer"
import type { SWEBenchInput, SWEBenchInstance, WorkflowIO } from "@core/workflow/ingestion/ingestion.types"
import { beforeEach, describe, expect, it, vi } from "vitest"

// mock the SWEBenchLoader
vi.mock("@core/evaluation/benchmarks/swe/SWEBenchLoader")

// typed mock for runtime CONFIG so CONFIG.ingestion.taskLimit exists
vi.mock("@examples/settings/constants", () => {
  const mockConfig = {
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
      parallelExecution: true,
      asyncExecution: true,
      maxTotalNodeInvocations: 20,
      maxPerNodeInvocations: 20,
      maxNodes: 20,
      handoffContent: "full",
      prepareProblem: false,
      prepareProblemMethod: "ai",
      prepareProblemWorkflowVersionId: "test",
    },
    tools: {
      inactive: [],
      uniqueToolsPerAgent: false,
      uniqueToolSetsPerAgent: false,
      maxToolsPerAgent: 3,
      maxStepsVercel: 10,
      defaultTools: [],
      autoSelectTools: false,
      usePrepareStepStrategy: false,
      experimentalMultiStepLoop: false,
      showParameterSchemas: false,
      experimentalMultiStepLoopMaxRounds: 20,
    },
    models: {
      inactive: [],
      provider: "openai",
    },
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
        addTools: false,
        analyzeWorkflow: false,
        removeNodes: false,
        editNodes: false,
        maxRetriesForWorkflowRepair: 3,
        useSummariesForImprovement: false,
        improvementType: "judge",
        operatorsWithFeedback: false,
      },
    },
    verification: { allowCycles: false, enableOutputValidation: false },
    context: { maxFilesPerWorkflow: 1, enforceFileLimit: false },
    evolution: {
      iterativeIterations: 1,
      GP: {
        generations: 1,
        populationSize: 1,
        verbose: false,
        initialPopulationMethod: "random",
        initialPopulationFile: null,
        maximumTimeMinutes: 1,
      },
    },
    ingestion: { taskLimit: 10 },
    limits: {
      maxConcurrentWorkflows: 1,
      maxConcurrentAIRequests: 1,
      maxCostUsdPerRun: 1,
      enableSpendingLimits: false,
      maxRequestsPerWindow: 100,
      rateWindowMs: 1000,
      enableStallGuard: false,
      enableParallelLimit: false,
    },
  } as const satisfies import("@core/types").FlowRuntimeConfig

  return { CONFIG: mockConfig }
})

describe("IngestionLayer - SWE-bench", () => {
  const mockInstance: SWEBenchInstance = {
    instance_id: "django__django-11099",
    problem_statement: "ValueError when accessing admin list page",
    text: "Full issue description with stack trace and reproduction steps...",
    repo: "django/django",
    base_commit: "abc123def456",
    patch:
      "diff --git a/django/admin/views.py b/django/admin/views.py\n--- a/django/admin/views.py\n+++ b/django/admin/views.py\n@@ -123,7 +123,7 @@\n-    old_code\n+    new_code",
    test_patch: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should convert SWE-bench evaluation to WorkflowIO", async () => {
    // mock the fetchAsWorkflowIO method to return mapped WorkflowIO
    const mockWorkflowIO: WorkflowIO[] = [
      {
        workflowInput: `Repository: ${mockInstance.repo}
Base commit: ${mockInstance.base_commit}

Problem statement:
${mockInstance.problem_statement}

Full issue text:
${mockInstance.text}`,
        workflowOutput: {
          output: `Expected patch:
${mockInstance.patch}`,
        },
      },
    ]
    vi.mocked(SWEBenchLoader.fetchAsWorkflowIO).mockResolvedValue(mockWorkflowIO)

    const evaluation: SWEBenchInput = {
      type: "swebench",
      goal: "Fix the bug described in this SWE-bench instance",
      workflowId: "test-workflow-id",
    }

    const result = await IngestionLayer.convert(evaluation)

    // verify SWEBenchLoader was called
    expect(SWEBenchLoader.fetchAsWorkflowIO).toHaveBeenCalled()

    // verify result structure
    expect(result).toHaveLength(1)
    const workflowCase = result[0]

    // verify workflow input contains all expected information from the instance
    expect(workflowCase.workflowInput).toContain(`Repository: ${mockInstance.repo}`)
    expect(workflowCase.workflowInput).toContain(`Base commit: ${mockInstance.base_commit}`)
    expect(workflowCase.workflowInput).toContain(`Problem statement:\n${mockInstance.problem_statement}`)
    expect(workflowCase.workflowInput).toContain(`Full issue text:\n${mockInstance.text}`)

    // verify workflow output is the patch
    // output contains the expected patch string
    expect(workflowCase.workflowOutput.output).toContain(mockInstance.patch)
  })

  it("should handle errors when fetching SWE-bench instance", async () => {
    // mock fetchAsWorkflowIO to throw an error
    vi.mocked(SWEBenchLoader.fetchAsWorkflowIO).mockRejectedValue(
      new Error("SWE-bench instance test-instance not found in split test"),
    )

    const evaluation: SWEBenchInput = {
      type: "swebench",
      goal: "Fix the bug",
      workflowId: "test-workflow-id",
    }

    // expect the conversion to throw
    await expect(IngestionLayer.convert(evaluation)).rejects.toThrow(
      "failed to convert SWE-bench evaluation: SWE-bench instance test-instance not found in split test",
    )
  })

  it("should handle network errors gracefully", async () => {
    // mock fetchAsWorkflowIO to throw a network error
    vi.mocked(SWEBenchLoader.fetchAsWorkflowIO).mockRejectedValue(new Error("Network error: Failed to fetch"))

    const evaluation: SWEBenchInput = {
      type: "swebench",
      goal: "Fix the bug",
      workflowId: "test-workflow-id",
    }

    // expect the conversion to throw with proper error message
    await expect(IngestionLayer.convert(evaluation)).rejects.toThrow(
      "failed to convert SWE-bench evaluation: Network error: Failed to fetch",
    )
  })
})
