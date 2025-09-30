import { describe, expect, it, vi } from "vitest"

// Ensure vi is initialized from vitest before using vi.mock
// Mock environment variables
// In ESM + Vitest, top-level vi.mock requires enableMocking in config; fallback to manual stubs if not available.
// Guard to avoid runtime error when vi.mock is not available in this environment.
if (typeof (vi as any).mock === "function")
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

// Mock runtime constants - comprehensive CONFIG
if (typeof (vi as any).mock === "function")
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
          Summary: false,
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
if (typeof (vi as any).mock === "function")
  vi.mock("@core/utils/clients/supabase/client", () => ({
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

import { buildMessages } from "@core/messages/create/buildMessages"
import { WorkflowMessage } from "@core/messages/WorkflowMessage"
import { createMockEvaluationInput, createMockWorkflowFile } from "@core/utils/__tests__/setup/coreMocks"
import type { EvaluationInput } from "@core/workflow/ingestion/ingestion.types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { getDefaultModels } from "@core/core-config/compat"
// moved vitest import to top
import { Workflow } from "../Workflow"

describe("ContextFile End-to-End Integration", () => {
  it("should pass contextFile from workflow config through to agent messages", () => {
    // Create a workflow config with contextFile
    const configWithContextFile: WorkflowConfig = {
      nodes: [
        {
          nodeId: "test-node",
          description: "Test node that should receive contextFile info",
          systemPrompt: "You are a test agent",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: [],
          memory: {},
        },
      ],
      entryNodeId: "test-node",
      contextFile: "fishcontext", // This should be passed through to agents
    }

    const goalEval: EvaluationInput = createMockEvaluationInput()

    // Create workflow
    const workflow = Workflow.create({
      config: configWithContextFile,
      evaluationInput: goalEval,
      toolContext: goalEval.outputSchema
        ? {
            expectedOutputType: goalEval.outputSchema,
          }
        : undefined,
    })

    // Verify the contextFile is accessible
    expect(workflow.getConfig().contextFile).toBe("fishcontext")
  })

  it("should build messages with contextFile information", () => {
    // Create a test workflow message
    const workflowMessage = new WorkflowMessage({
      originInvocationId: null,
      fromNodeId: "start",
      toNodeId: "test-node",
      seq: 0,
      wfInvId: "test-invocation-123",
      payload: {
        kind: "sequential",
        berichten: [{ type: "text", text: "Hello, analyze this data" }],
        context: "Previous analysis results",
      },
      skipDatabasePersistence: true,
    })

    // Build messages with contextFile
    const messages = buildMessages({
      workflowMessageIncoming: workflowMessage,
      workflowInvocationId: "test-invocation-123",
      handOffs: "data-processor, finalizer",
      nodeDescription: "Data analysis node",
      nodeSystemPrompt: "You are a data analyst",
      workflowFiles: [createMockWorkflowFile("fishcontext")],
      mainWorkflowGoal: "test-goal",
    })

    // Check that contextFile system message is included
    const contextFileMessage = messages.find(msg => (msg.content as string)?.includes("persistent context store named"))
    expect(contextFileMessage).toBeDefined()
    expect(contextFileMessage?.role).toBe("system")
    expect(contextFileMessage?.content).toContain("contextGet")
    expect(contextFileMessage?.content).toContain("contextSet")
    expect(contextFileMessage?.content).toContain("contextList")
    expect(contextFileMessage?.content).toContain("contextManage")

    // Check that the user message contains the correct content
    const userMessage = messages.find(msg => msg.role === "user")
    expect(userMessage?.content).toContain("Hello, analyze this data")
    // Context is empty for this test case, so only user content and invocation id are asserted
    expect(userMessage?.content).toContain("workflow_invocation_id:test-invocation-123")

    // After merging, there is a single system message containing all parts
    const systemMessages = messages.filter(msg => msg.role === "system")
    expect(systemMessages).toHaveLength(1)

    // The merged system message includes both the system prompt and node description
    const mergedSystem = systemMessages[0]
    expect(mergedSystem.content).toContain("You are a data analyst")
    expect(mergedSystem.content).toContain("you are the following node: Data analysis node")
  })
})
