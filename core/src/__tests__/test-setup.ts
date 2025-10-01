// vitest setup file
import fs from "fs"
import os from "os"
import path from "path"
import { beforeEach, vi } from "vitest"

// Make vi globally available
declare global {
  var vi: typeof import("vitest").vi
}
global.vi = vi

// Set up environment variables for all tests
process.env.GOOGLE_API_KEY = "test-google-key"
process.env.OPENAI_API_KEY = "test-openai-key"
process.env.SERPAPI_API_KEY = "test-serp-key"
process.env.TAVILY_API_KEY = "test-tavily-key"
process.env.FIRECRAWL_API_KEY = "test-firecrawl-key"
process.env.SUPABASE_ANON_KEY = "test-supabase-key"
process.env.SUPABASE_PROJECT_ID = "test-project-id"
process.env.OPENROUTER_API_KEY = "test-openrouter-key"
process.env.XAI_API_KEY = "test-xai-key"
process.env.MAPBOX_TOKEN = "test-mapbox-token"
process.env.HF_TOKEN = "test-hf-token"
process.env.HUGGING_FACE_API_KEY = "test-hf-key"
process.env.WEBSHARE_API_KEY = "test-webshare-key"

// Universal mocks for all tests - applied at the top level to prevent import issues

// Mock environment variables to prevent validation failures
vi.mock("@core/utils/env.mjs", () => ({
  envi: {
    GOOGLE_API_KEY: "test-google-key",
    OPENAI_API_KEY: "test-openai-key",
    SERPAPI_API_KEY: "test-serp-key",
    TAVILY_API_KEY: "test-tavily-key",
    FIRECRAWL_API_KEY: "test-firecrawl-key",
    SUPABASE_ANON_KEY: "test-supabase-key",
    SUPABASE_PROJECT_ID: "test-project-id",
    OPENROUTER_API_KEY: "test-openrouter-key",
    XAI_API_KEY: "test-xai-key",
    MAPBOX_TOKEN: "test-mapbox-token",
    HF_TOKEN: "test-hf-token",
    HUGGING_FACE_API_KEY: "test-hf-key",
    WEBSHARE_API_KEY: "test-webshare-key",
  },
}))

// Compute safe temp directories for filesystem paths during tests
const TEST_TMP_ROOT = path.join(os.tmpdir(), "together-tests")
const TEST_LOGGING_DIR = path.join(TEST_TMP_ROOT, "node", "logging")
const TEST_MEMORY_ROOT = path.join(TEST_TMP_ROOT, "memory", "root")
const TEST_MEMORY_WORKFILES = path.join(TEST_TMP_ROOT, "memory", "workfiles")
const TEST_ERROR_DIR = path.join(TEST_TMP_ROOT, "node", "error")

// Mock runtime constants to prevent import resolution issues and avoid writing to root
vi.mock("@examples/settings/constants", () => ({
  CONFIG: {
    coordinationType: "sequential" as const,
    newNodeProbability: 0.7,
    logging: {
      level: "info" as const,
      override: {
        API: false,
        GP: false,
        Database: false,
      },
    },
    workflow: {
      maxTotalNodeInvocations: 14,
      maxPerNodeInvocations: 14,
      maxNodes: 20,
      handoffContent: "full" as const,
      prepareProblem: true,
      prepareProblemMethod: "ai" as const,
      prepareProblemWorkflowVersionId: "test-version-id",
      parallelExecution: false,
    },
    tools: {
      inactive: new Set(),
      uniqueToolsPerAgent: false,
      uniqueToolSetsPerAgent: false,
      maxToolsPerAgent: 3,
      maxStepsVercel: 10,
      defaultTools: new Set(["todoRead", "todoWrite"]), // Test tools: always available, simple & predictable
      autoSelectTools: true,
      usePrepareStepStrategy: false,
      experimentalMultiStepLoop: true,
      showParameterSchemas: true,
    },
    models: {
      provider: "openai" as const,
      inactive: new Set(),
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
        improvementType: "judge" as const,
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
      iterativeIterations: 50,
      GP: {
        generations: 40,
        populationSize: 10,
        verbose: false,
        initialPopulationMethod: "prepared" as const,
        initialPopulationFile: "",
        maximumTimeMinutes: 700,
      },
    },
    limits: {
      maxConcurrentWorkflows: 2,
      maxConcurrentAIRequests: 30,
      maxCostUsdPerRun: 30.0,
      enableSpendingLimits: true,
      rateWindowMs: 10000,
      maxRequestsPerWindow: 300,
      enableStallGuard: true,
      enableParallelLimit: true,
    },
  },
  MODELS: {
    summary: "google/gemini-2.0-flash-001",
    nano: "google/gemini-2.0-flash-001",
    default: "openai/gpt-4.1-mini",
    free: "qwen/qwq-32b:free",
    free2: "deepseek/deepseek-r1-0528:free",
    low: "openai/gpt-4.1-nano",
    medium: "openai/gpt-4.1-mini",
    high: "openai/gpt-4.1-mini",
    fitness: "openai/gpt-4.1-mini",
    reasoning: "openai/gpt-4.1-mini",
    fallbackOpenRouter: "switchpoint/router",
  },
  PATHS: {
    root: TEST_TMP_ROOT,
    app: path.join(TEST_TMP_ROOT, "app"),
    runtime: path.join(TEST_TMP_ROOT, "examples"),
    codeTools: path.join(TEST_TMP_ROOT, "codeTools"),
    setupFile: path.join(TEST_TMP_ROOT, "setup.json"),
    improver: path.join(TEST_TMP_ROOT, "improver"),
    node: {
      logging: TEST_LOGGING_DIR,
      memory: {
        root: TEST_MEMORY_ROOT,
        workfiles: TEST_MEMORY_WORKFILES,
      },
      error: TEST_ERROR_DIR,
    },
  },
}))

// Note: MCP tests (*.spec.test.ts in tools/mcp/__tests__/) should set up their own
// MCP_SECRET_PATH if needed. General tests don't require MCP configuration.

// Mock tool exports to provide test-friendly tools
vi.mock("@lucky/tools/client", async importOriginal => {
  const actual = (await importOriginal()) as any
  return {
    ...actual,
    ACTIVE_CODE_TOOL_NAMES: ["todoRead", "todoWrite"],
    ACTIVE_MCP_TOOL_NAMES: ["tavily"],
    ALL_ACTIVE_TOOL_NAMES: ["todoRead", "todoWrite", "tavily"],
    ACTIVE_CODE_TOOL_NAMES_WITH_DEFAULT: ["todoRead", "todoWrite"],
    ACTIVE_TOOLS_WITH_DESCRIPTION: {
      todoRead: "Read the current session's todo list",
      todoWrite: "Create and manage structured task lists",
      tavily: "Search the web",
    },
    ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION: {
      todoRead: "Read the current session's todo list",
      todoWrite: "Create and manage structured task lists",
    },
    ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION: {
      tavily: "Search the web",
    },
    INACTIVE_TOOLS: new Set(),
  }
})

// Mock Supabase client to prevent database connection issues
vi.mock("@core/utils/clients/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null, data: [{ id: "test-id" }] }),
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

// ensure clean state between tests
beforeEach(() => {
  // clear all mocks between tests
  vi.clearAllMocks()
})
