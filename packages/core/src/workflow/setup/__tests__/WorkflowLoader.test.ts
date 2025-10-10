// Mock environment variables
vi.mock("@core/utils/env.mjs", () => ({
  envi: {
    GOOGLE_API_KEY: "test-google-key",
    OPENAI_API_KEY: "test-openai-key",
    SERPAPI_API_KEY: "test-serp-key",
    TAVILY_API_KEY: "test-tavily-key",
    FIRECRAWL_API_KEY: "test-firecrawl-key",
    SUPABASE_ANON_KEY: "test-supabase-key",
    SUPABASE_PROJECT_ID: "testprojectid",
    OPENROUTER_API_KEY: "test-openrouter-key",
    XAI_API_KEY: "test-xai-key",
    MAPBOX_TOKEN: "test-mapbox-token",
    HF_TOKEN: "test-hf-token",
    HUGGING_FACE_API_KEY: "test-hf-key",
    WEBSHARE_API_KEY: "test-webshare-key",
  },
}))

import os from "node:os"
import path from "node:path"
import type { FlowPathsConfig, FlowRuntimeConfig, FullFlowRuntimeConfig } from "@core/types"

// Mock runtime constants - typed and safe temp paths
vi.mock("@examples/settings/constants", () => {
  const TEST_ROOT = path.join(os.tmpdir(), "together-tests", "workflowloader")
  const RUNTIME = path.join(TEST_ROOT, "examples")
  const LOGGING = path.join(RUNTIME, "logging_folder")
  const MEMORY_ROOT = path.join(LOGGING, "memory")
  const SETUP_FILE = path.join(RUNTIME, "setup", "setupfile.json")

  const PATHS_T: FlowPathsConfig = {
    root: TEST_ROOT,
    app: path.join(TEST_ROOT, "app"),
    runtime: RUNTIME,
    codeTools: path.join(RUNTIME, "code_tools"),
    setupFile: SETUP_FILE,
    improver: path.join(RUNTIME, "setup", "improve.json"),
    node: {
      logging: LOGGING,
      memory: {
        root: MEMORY_ROOT,
        workfiles: path.join(MEMORY_ROOT, "workfiles"),
      },
      error: path.join(LOGGING, "error"),
    },
  }

  const MODELS_T: FullFlowRuntimeConfig["MODELS"] = {
    inactive: [],
    provider: "openai",
  }

  const CONFIG_T: FlowRuntimeConfig = {
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
      asyncExecution: true,
      maxTotalNodeInvocations: 14,
      maxPerNodeInvocations: 14,
      maxNodes: 20,
      handoffContent: "full",
      prepareProblem: true,
      prepareProblemMethod: "ai",
      prepareProblemWorkflowVersionId: "test-version-id",
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
      experimentalMultiStepLoopMaxRounds: 0,
    },
    models: {
      inactive: [],
      provider: MODELS_T.provider,
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
    verification: {
      allowCycles: true,
      enableOutputValidation: false,
      maxFilesPerWorkflow: 1,
      enforceFileLimit: true,
    },

    evolution: {
      iterativeIterations: 50,
      GP: {
        generations: 40,
        populationSize: 10,
        verbose: false,
        initialPopulationMethod: "prepared",
        initialPopulationFile: "",
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
      maxFilesPerWorkflow: 1,
      enforceFileLimit: true,
    },
  }

  return { CONFIG: CONFIG_T, MODELS: MODELS_T, PATHS: PATHS_T }
})

// Mock Supabase client
vi.mock("@core/clients/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ error: null, data: { id: "test-id" } }),
        }),
      }),
      upsert: vi.fn().mockResolvedValue({ error: null, data: [{ id: "test-id" }] }),
      select: vi.fn().mockResolvedValue({ error: null, data: [] }),
      update: vi.fn().mockResolvedValue({ error: null, data: [{ id: "test-id" }] }),
      delete: vi.fn().mockResolvedValue({ error: null }),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ error: null, data: { id: "test-id" } }),
    }),
  },
}))

import { PATHS } from "@core/core-config/compat"
import { describe, expect, it, vi } from "vitest"
import { WorkflowConfigHandler, loadSingleWorkflow } from "../WorkflowLoader"

describe("WorkflowConfigHandler", () => {
  it("should load single workflow successfully", async () => {
    const loader = WorkflowConfigHandler.getInstance()
    const workflow = await loader.loadSingleWorkflow()

    expect(workflow).toBeDefined()
    expect(workflow.entryNodeId).toBeDefined()
    expect(workflow.nodes).toBeDefined()
    expect(Array.isArray(workflow.nodes)).toBe(true)
    expect(workflow.nodes.length).toBeGreaterThan(0)
  })

  it("should use singleton pattern", () => {
    const loader1 = WorkflowConfigHandler.getInstance()
    const loader2 = WorkflowConfigHandler.getInstance()

    expect(loader1).toBe(loader2)
  })

  it("should export convenience function", async () => {
    const workflow = await loadSingleWorkflow(PATHS.setupFile)

    expect(workflow).toBeDefined()
    expect(workflow.entryNodeId).toBeDefined()
    expect(workflow.nodes).toBeDefined()
  })
})
