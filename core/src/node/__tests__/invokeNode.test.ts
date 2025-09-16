// Mock environment variables
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

import os from "os"
import path from "path"
import { z } from "zod"

// Mock sendAI to avoid real API calls
vi.mock("@core/messages/api/sendAI/sendAI", () => ({
  sendAI: vi.fn(),
}))

// Mock processResponseVercel to return proper handoff
vi.mock("@core/messages/api/processResponse", () => ({
  processResponseVercel: vi.fn().mockReturnValue({
    type: "text",
    text: "Test response: I received your input.",
    handoff: "end",
  }),
  getResponseContent: vi.fn().mockImplementation((response) => {
    if (response?.text) return response.text
    if (response?.type === "text" && response?.text) return response.text
    return "Test response: I received your input."
  }),
  // Some parts of the pipeline import this helper; provide a stubbed export
  getFinalOutputNodeInvocation: vi
    .fn()
    .mockReturnValue("Test response: I received your input."),
}))

// Mock runtime constants - comprehensive CONFIG
vi.mock("@runtime/settings/constants", () => {
  // compute temp paths inside the factory to avoid hoist issues
  const tmpRoot = path.join(os.tmpdir(), "together-tests")
  const loggingDir = path.join(tmpRoot, "node", "logging")
  const memoryRoot = path.join(tmpRoot, "memory", "root")
  const memoryWorkfiles = path.join(tmpRoot, "memory", "workfiles")
  const errorDir = path.join(tmpRoot, "node", "error")

  return {
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
          InvocationPipeline: false,
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
        experimentalMultiStepLoopMaxRounds: 5,
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
      root: tmpRoot,
      app: path.join(tmpRoot, "app"),
      runtime: path.join(tmpRoot, "runtime"),
      codeTools: path.join(tmpRoot, "codeTools"),
      setupFile: path.join(tmpRoot, "setup.json"),
      improver: path.join(tmpRoot, "improver"),
      node: {
        logging: loggingDir,
        memory: {
          root: memoryRoot,
          workfiles: memoryWorkfiles,
        },
        error: errorDir,
      },
    },
  }
})

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

import { beforeEach, describe, expect, it, vi } from "vitest"

import { sendAI } from "@core/messages/api/sendAI/sendAI"
import type {
  StructuredRequest,
  TextRequest,
  ToolRequest,
  TResponse,
} from "@core/messages/api/sendAI/types"
import type { WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"
import { getDefaultModels } from "@runtime/settings/constants.client"
import { invokeAgent } from "../invokeNode"

describe("invokeAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Configure default mock behavior
    const sendAIMockImpl = (
      req: TextRequest | ToolRequest | StructuredRequest<any>
    ): Promise<TResponse<any>> => {
      // For structured handoff calls
      if (req.mode === "structured") {
        return Promise.resolve({
          success: true,
          data: {
            handoff: "end",
            reason: "Task completed",
            error: null,
            hasError: false,
            handoffContext: "Task completed successfully",
          },
          error: null,
          usdCost: 0.001,
          debug_input: [],
          debug_output: {},
        })
      }

      // For text generation calls
      return Promise.resolve({
        success: true,
        data: {
          text: "Test response: I received your input.",
        },
        error: null,
        usdCost: 0.002,
        debug_input: [],
        debug_output: {},
      })
    }

    ;(
      sendAI as unknown as {
        mockImplementation: (fn: typeof sendAIMockImpl) => void
      }
    ).mockImplementation(sendAIMockImpl)
  })

  it("should invoke a simple node and return mocked result", async () => {
    // Create a minimal node configuration
    const nodeConfig: WorkflowNodeConfig = {
      nodeId: "test-node",
      description: "A test node for unit testing",
      systemPrompt:
        "You are a helpful assistant. Just respond with the input you received.",
      modelName: getDefaultModels().nano,
      mcpTools: [],
      codeTools: [],
      handOffs: ["end"], // Single node invocation should end here
      memory: {},
    }

    const prompt = "Hello, this is a test prompt."

    // Invoke the node with database persistence skipped for testing
    const result = await invokeAgent({
      nodeConfig,
      prompt,
      skipDatabasePersistence: true,
    })

    // Verify the result structure
    expect(result.nodeInvocationId).toBeDefined()
    expect(result.nodeInvocationFinalOutput).toBeDefined()
    expect(typeof result.nodeInvocationFinalOutput).toBe("string")
    expect(result.nodeInvocationFinalOutput).toBe(
      "Test response: I received your input."
    )

    // Verify node followed the handoffs
    expect(result.nextIds).toEqual(["end"])

    // Verify cost tracking
    expect(result.usdCost).toBeDefined()
    expect(result.usdCost).toBeGreaterThanOrEqual(0)

    // Verify agent steps were recorded
    expect(result.agentSteps).toBeDefined()
    expect(Array.isArray(result.agentSteps)).toBe(true)
  })

  it("should handle node with tools", async () => {
    // Override mock for this specific test to return next-node handoff
    const sendAIMockImpl2 = (
      req: TextRequest | ToolRequest | StructuredRequest<any>
    ): Promise<TResponse<any>> => {
      if (req.mode === "structured") {
        return Promise.resolve({
          success: true,
          data: {
            handoff: "next-node",
            reason: "Need to process further",
            error: null,
            hasError: false,
            handoffContext: "Process with next node",
          },
          error: null,
          usdCost: 0.001,
          debug_input: [],
          debug_output: {},
        })
      }

      return Promise.resolve({
        success: true,
        data: {
          text: "Test response: I received your input.",
        },
        error: null,
        usdCost: 0.002,
        debug_input: [],
        debug_output: {},
      })
    }
    ;(
      sendAI as unknown as {
        mockImplementation: (fn: typeof sendAIMockImpl2) => void
      }
    ).mockImplementation(sendAIMockImpl2)

    const nodeConfig: WorkflowNodeConfig = {
      nodeId: "tool-node",
      description: "A node with tools",
      systemPrompt: "You have access to tools. Use them if needed.",
      modelName: getDefaultModels().nano,
      mcpTools: [],
      codeTools: ["saveFileLegacy", "readFileLegacy"],
      handOffs: ["next-node", "end"],
      memory: {},
    }

    const result = await invokeAgent({
      nodeConfig,
      prompt: "Process this with tools",
      handOffs: ["next-node", "end"],
      skipDatabasePersistence: true,
    })

    expect(result.nodeInvocationId).toBeDefined()
    expect(result.nodeInvocationFinalOutput).toBeDefined()
    expect(result.nextIds).toEqual(["next-node"])
  })

  it("should handle node with memory", async () => {
    const nodeConfig: WorkflowNodeConfig = {
      nodeId: "memory-node",
      description: "A node with initial memory",
      systemPrompt: "You have memory from previous runs.",
      modelName: getDefaultModels().nano,
      mcpTools: [],
      codeTools: [],
      handOffs: ["end"],
      memory: {
        previousResult: "cached data",
        counter: "5",
      },
    }

    const result = await invokeAgent({
      nodeConfig,
      prompt: "Use your memory",
      skipDatabasePersistence: true,
    })

    expect(result.nodeInvocationId).toBeDefined()
    expect(result.nodeInvocationFinalOutput).toBeDefined()
    // Memory updates might be returned
    if (result.updatedMemory) {
      expect(typeof result.updatedMemory).toBe("object")
    }
  })

  it("should handle custom workflow context", async () => {
    const nodeConfig: WorkflowNodeConfig = {
      nodeId: "context-node",
      description: "A node with workflow context",
      systemPrompt: "Process based on workflow goal.",
      modelName: getDefaultModels().nano,
      mcpTools: [],
      codeTools: [],
      handOffs: ["analyzer", "summarizer", "end"],
      memory: {},
    }

    const result = await invokeAgent({
      nodeConfig,
      prompt: "Analyze this data",
      mainWorkflowGoal: "Extract key insights from customer feedback",
      expectedOutputType: z.object({
        insights: z.array(z.string()),
        sentiment: z.enum(["positive", "negative", "neutral"]),
      }),
      skipDatabasePersistence: true,
    })

    expect(result.nodeInvocationId).toBeDefined()
    expect(result.nodeInvocationFinalOutput).toBeDefined()
    expect(result.nextIds.length).toBeGreaterThan(0)
  })
})
