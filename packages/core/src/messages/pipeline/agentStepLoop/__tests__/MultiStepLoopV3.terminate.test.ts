import { getDefaultModels } from "@core/core-config/coreConfig"
import type { MultiStepLoopContext } from "@core/messages/pipeline/agentStepLoop/utils"
import type { NodeInvocationCallContext } from "@core/messages/pipeline/input.types"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

// TODO: Test relies heavily on mocks - consider testing with real implementations
// Mock summary generator to keep it deterministic
vi.mock("@core/messages/api/genObject", () => ({
  quickSummaryNull: vi.fn().mockResolvedValue("quick summary stub"),
}))

// Mock learning to avoid real LLM calls
vi.mock("@core/prompts/makeLearning", () => ({
  makeLearning: vi.fn().mockResolvedValue({
    agentStep: { type: "learning", return: "learned something" },
    updatedMemory: { key: "value" },
  }),
}))

// Force the strategy to terminate immediately so we hit the termination branch
vi.mock("@core/messages/pipeline/selectTool/selectToolStrategyV3", () => ({
  selectToolStrategyV3: vi.fn().mockResolvedValue({
    strategyResult: { type: "terminate", reasoning: "done", usdCost: 0 },
    debugPrompt: "debug stub",
  }),
}))

// TODO: Only tests termination case - need tests for other multi-step scenarios
// TODO: No tests for error handling in the multi-step loop
describe("runMultiStepLoopV3Helper termination", () => {
  let ctx: NodeInvocationCallContext

  beforeEach(() => {
    ctx = {
      startTime: new Date().toISOString(),
      workflowId: "wf_test",
      workflowVersionId: "wf_v_test",
      workflowInvocationId: "inv_test",
      workflowFiles: [],
      expectedOutputType: z.string().describe("test output type"),
      mainWorkflowGoal: "test goal",
      workflowMessageIncoming: {
        messageId: "msg1",
        fromNodeId: "start",
        toNodeId: "nodeA",
        seq: 1,
        wfInvId: "inv_test",
        originInvocationId: null,
        payload: {
          kind: "sequential",
          berichten: [{ type: "text", text: "hello" }],
        },
        updateMessage: () => {},
      } as any,
      nodeConfig: {
        nodeId: "nodeA",
        handOffs: ["end"],
        description: "test node",
        systemPrompt: "you are a helpful node",
        modelName: getDefaultModels().default,
        codeTools: [],
        mcpTools: [],
        waitingFor: [],
      },
      nodeMemory: {},
    }
  })

  it("always appends a terminate step in v3 flow", async () => {
    // avoid importing real sendAI/env chain
    vi.mock("@core/messages/api/sendAI/sendAI", () => ({
      sendAI: vi.fn().mockResolvedValue({
        success: true,
        data: { text: "ok", steps: [], usage: {} },
        usdCost: 0,
      }),
      normalizeModelName: vi.fn().mockReturnValue("openai/gpt-4.1-mini"),
    }))

    const { runMultiStepLoopV3Helper } = await import("@core/messages/pipeline/agentStepLoop/MultiStepLoopV3")
    const context: MultiStepLoopContext = {
      ctx,
      tools: {},
      agentSteps: [],
      model: ctx.nodeConfig.modelName,
      maxRounds: 1,
      verbose: false,
      addCost: () => {},
      setUpdatedMemory: () => {},
      getTotalCost: () => 0,
    }

    const { processedResponse } = await runMultiStepLoopV3Helper(context)
    const steps = processedResponse.agentSteps ?? []

    // TODO: Using @ts-expect-error indicates type system doesn't match runtime
    // Should fix types rather than suppressing errors
    // Ensure last step is terminate and includes a summary
    expect(steps.length).toBeGreaterThan(0)
    const last = steps[steps.length - 1]!
    expect(last.type).toBe("terminate")
    // @ts-expect-error: summary only exists on terminate/tool
    expect(last.summary).toBeDefined()
  })
})
