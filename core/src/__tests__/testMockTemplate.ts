// Template for test mocks - copy these into your test files

// Mock environment variables
vi.mock("@core/utils/env.mjs", () => ({
  envi: {
    GOOGLE_API_KEY: "test-google-key",
    OPENAI_API_KEY: "test-openai-key",
    SERPAPI_API_KEY: "test-serp-key",
    ANTHROPIC_API_KEY: "test-anthropic-key",
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

// Mock runtime constants - comprehensive CONFIG
vi.mock("@runtime/settings/constants", () => ({
  CONFIG: {
    coordinationType: "sequential" as const,
    newNodeProbability: 0.7,
    logging: {
      level: "info" as const,
      override: {
        API: false,
        GP: false,
        Database: false,
        Summary: false,
      },
    },
    workflow: {
      maxNodeInvocations: 14,
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
      defaultTools: new Set(),
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
    high: "anthropic/claude-sonnet-4",
    fitness: "openai/gpt-4.1-mini",
    reasoning: "anthropic/claude-sonnet-4",
    fallbackOpenRouter: "switchpoint/router",
  },
  PATHS: {
    root: "/test/root",
    app: "/test/app",
    runtime: "/test/runtime",
    codeTools: "/test/codeTools",
    setupFile: "/test/setup.json",
    improver: "/test/improver",
    node: {
      logging: "/test/node/logging",
      memory: {
        root: "/test/memory/root",
        workfiles: "/test/memory/workfiles",
      },
      error: "/test/node/error",
    },
  },
}))

// Mock Supabase client
vi.mock("@core/utils/clients/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ error: null, data: { id: "test-id" } }),
        }),
      }),
      upsert: vi
        .fn()
        .mockResolvedValue({ error: null, data: [{ id: "test-id" }] }),
      select: vi.fn().mockResolvedValue({ error: null, data: [] }),
      update: vi
        .fn()
        .mockResolvedValue({ error: null, data: [{ id: "test-id" }] }),
      delete: vi.fn().mockResolvedValue({ error: null }),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ error: null, data: { id: "test-id" } }),
    }),
  },
}))
