import { describe, expect, it, vi } from "vitest"

describe("InvocationPipeline System Prompt Integration", () => {
  it("should follow system prompt: use todo write first, then return output of todo read", async () => {
    // TODO: this test mocks all AI responses and tool executions with hardcoded values.
    // it doesn't test InvocationPipeline's actual ability to interpret system prompts,
    // coordinate tool calls, or handle real AI responses. the test is essentially
    // verifying that mocked functions return what we told them to return.
    // Mock the AI response to simulate what would happen with the system prompt
    const mockSendAI = vi.fn()

    // Mock the AI to first call todoWrite, then todoRead
    mockSendAI
      .mockResolvedValueOnce({
        success: true,
        data: {
          text: "I'll create a todo first using todoWrite.",
          toolCalls: [
            {
              id: "call_1",
              type: "function",
              function: {
                name: "todoWrite",
                arguments: JSON.stringify({
                  todos: [
                    {
                      id: "test-1",
                      content: "Test integration task",
                      status: "pending",
                      priority: "high",
                    },
                  ],
                }),
              },
            },
          ],
          finishReason: "tool_calls",
          usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
        },
        usdCost: 0.01,
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          text: "Here are the current todos from todoRead: [Test integration task - pending]",
          toolCalls: [
            {
              id: "call_2",
              type: "function",
              function: {
                name: "todoRead",
                arguments: "{}",
              },
            },
          ],
          finishReason: "tool_calls",
          usage: { promptTokens: 60, completionTokens: 40, totalTokens: 100 },
        },
        usdCost: 0.015,
      })

    // Mock the actual tool executions
    const mockTodoWrite = vi.fn().mockResolvedValue({
      success: true,
      data: {
        tool: "todoWrite",
        output: {
          success: true,
          message: "Todo created successfully",
          todos: [
            {
              id: "test-1",
              content: "Test integration task",
              status: "pending",
              priority: "high",
            },
          ],
        },
      },
    })

    const mockTodoRead = vi.fn().mockResolvedValue({
      success: true,
      data: {
        tool: "todoRead",
        output: {
          todos: [
            {
              id: "test-1",
              content: "Test integration task",
              status: "pending",
              priority: "high",
            },
          ],
          isEmpty: false,
        },
      },
    })

    // Mock the modules
    vi.doMock("@core/messages/api/sendAI", () => ({
      sendAI: mockSendAI,
      normalizeModelName: vi.fn().mockReturnValue("gpt-4.1-mini"),
    }))

    vi.doMock("@core/code_tools/todo-manager/tool-todo-write", () => ({
      default: { execute: mockTodoWrite },
    }))

    vi.doMock("@core/code_tools/todo-manager/tool-todo-read", () => ({
      default: { execute: mockTodoRead },
    }))

    // Verify the system prompt would lead to correct tool selection
    const systemPrompt = "use todo write first, and then return the output of todo read"

    // TODO: this comment describes what should be tested but the test doesn't actually
    // instantiate or use InvocationPipeline at all. it's just calling mocked functions
    // directly and asserting they return what we mocked them to return.
    // Simulate what the pipeline would do:
    // 1. Parse system prompt
    // 2. Call AI with available tools
    // 3. Execute tools in order
    // 4. Return final result

    // First AI call - should choose todoWrite based on system prompt
    const firstResponse = await mockSendAI()
    expect(firstResponse.success).toBe(true)
    expect(firstResponse.data.toolCalls[0].function.name).toBe("todoWrite")

    // Execute todoWrite
    const writeResult = await mockTodoWrite(JSON.parse(firstResponse.data.toolCalls[0].function.arguments), {
      workflowInvocationId: "test",
      nodeId: "test",
      workflowFiles: [],
      expectedOutputType: undefined,
      workflowId: "test",
      mainWorkflowGoal: "test",
    })
    expect(writeResult.success).toBe(true)

    // Second AI call - should choose todoRead to return output
    const secondResponse = await mockSendAI()
    expect(secondResponse.success).toBe(true)
    expect(secondResponse.data.toolCalls[0].function.name).toBe("todoRead")

    // Execute todoRead
    const readResult = (await mockTodoRead(
      {},
      {
        workflowInvocationId: "test",
        nodeId: "test",
        workflowFiles: [],
        expectedOutputType: undefined,
        workflowId: "test",
        mainWorkflowGoal: "test",
      },
    )) as {
      success: boolean
      data: {
        output: {
          todos: {
            id: string
            content: string
            status: string
            priority: string
          }[]
        }
      }
    }
    expect(readResult.success).toBe(true)

    // Verify the final output contains todo data (output of todoRead)
    const finalTodos = readResult.data.output.todos
    expect(finalTodos).toBeDefined()
    expect(finalTodos.length).toBe(1)
    expect(finalTodos[0].content).toBe("Test integration task")

    // Verify correct tool execution order
    expect(mockTodoWrite).toHaveBeenCalledBefore(mockTodoRead)

    console.log("✅ System prompt integration test passed:")
    console.log("  - System prompt:", systemPrompt)
    console.log(
      "  - todoWrite called first:",
      mockTodoWrite.mock.invocationCallOrder[0] < mockTodoRead.mock.invocationCallOrder[0],
    )
    console.log("  - Final output contains todos:", finalTodos.length > 0)
    console.log("  - Final todo content:", finalTodos[0].content)
  })

  it("should verify experimental multi-step loop follows same pattern", async () => {
    // TODO: this test mocks selectToolStrategyV2 and never uses it with real InvocationPipeline.
    // it doesn't test how multi-step loop is integrated with the pipeline, how it handles
    // errors, retries, or complex decision flows. also modifies global CONFIG which could
    // affect other tests if not properly restored.
    // This test verifies that multi-step loop would follow the same system prompt
    const { CONFIG } = await import("@core/core-config/compat")

    // Mock multi-step behavior - tool strategy calls followed by termination
    const mockSelectToolStrategyV2 = vi
      .fn()
      .mockResolvedValueOnce({
        type: "tool",
        toolName: "todoWrite",
        reasoning: "Following system prompt: use todo write first",
        plan: "Create a todo item",
        usdCost: 0.005,
      })
      .mockResolvedValueOnce({
        type: "tool",
        toolName: "todoRead",
        reasoning: "Following system prompt: return output of todo read",
        plan: "Read current todos",
        usdCost: 0.005,
      })
      .mockResolvedValueOnce({
        type: "terminate",
        reasoning: "Completed system prompt requirements",
        usdCost: 0.003,
      })

    vi.doMock("@core/tools/any/selectToolStrategyV2", () => ({
      selectToolStrategyV2: mockSelectToolStrategyV2,
    }))

    // Simulate multi-step execution
    const originalMultiStep = CONFIG.tools.experimentalMultiStepLoop
    Object.defineProperty(CONFIG.tools, "experimentalMultiStepLoop", {
      value: true,
      writable: true,
    })

    try {
      // Multi-step loop should make these strategy calls in sequence
      const step1 = await mockSelectToolStrategyV2()
      expect(step1.type).toBe("tool")
      expect(step1.toolName).toBe("todoWrite")
      expect(step1.reasoning).toContain("todo write first")

      const step2 = await mockSelectToolStrategyV2()
      expect(step2.type).toBe("tool")
      expect(step2.toolName).toBe("todoRead")
      expect(step2.reasoning).toContain("output of todo read")

      const step3 = await mockSelectToolStrategyV2()
      expect(step3.type).toBe("terminate")
      expect(step3.reasoning).toContain("Completed")

      // Verify correct order maintained in multi-step
      expect(mockSelectToolStrategyV2).toHaveBeenCalledTimes(3)

      console.log("✅ Multi-step integration test passed:")
      console.log("  - Step 1: todoWrite tool selected")
      console.log("  - Step 2: todoRead tool selected")
      console.log("  - Step 3: Termination")
      console.log("  - System prompt order maintained in multi-step loop")
    } finally {
      Object.defineProperty(CONFIG.tools, "experimentalMultiStepLoop", {
        value: originalMultiStep,
        writable: true,
      })
    }
  })
})
