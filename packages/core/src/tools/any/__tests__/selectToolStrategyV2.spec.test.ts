import { getDefaultModels } from "@core/core-config/coreConfig"
import type { AgentSteps } from "@core/messages/pipeline/AgentStep.types"
import { selectToolStrategyV2 } from "@core/messages/pipeline/selectTool/selectToolStrategyV2"
import { type ToolSet, tool } from "ai"
import { beforeEach, describe, expect, it } from "vitest"
import { z } from "zod"

// Mock tools for testing
const mockTools: ToolSet = {
  todoWrite: tool({
    description: "Write a todo item to the todo list",
    inputSchema: z.object({
      todo: z.string().describe("The todo item to write"),
    }),
    execute: async () => ({}),
  }),
  todoRead: tool({
    description: "Read the current todo list",
    inputSchema: z.object({}),
    execute: async () => ({}),
  }),
  locationDataManager: tool({
    description: "Manage location data operations",
    inputSchema: z.object({
      operation: z.enum(["insertLocations", "updateLocations", "deleteLocations"]),
      locationData: z
        .array(
          z.object({
            name: z.string(),
            lat: z.number(),
            lng: z.number(),
          }),
        )
        .optional(),
    }),
    execute: async () => ({}),
  }),
}

describe("selectToolStrategyV2 Integration Tests", () => {
  let identityPrompt: string
  let agentSteps: AgentSteps
  const model = getDefaultModels().balanced

  beforeEach(() => {
    identityPrompt = "Please create a simple todo list with items: buy groceries, walk the dog, finish project"
    agentSteps = []
  })

  it("should select todoWrite tool for todo creation task", async () => {
    // TODO: This test doesn't verify HOW the tool is selected. It's essentially testing
    // that the AI selects the right tool based on the task description, but this is
    // non-deterministic and depends on the AI model. The test might pass/fail randomly.
    const systemMessage =
      "You are a helpful assistant that manages todo lists. Create and manage todo items as requested."

    const result = await selectToolStrategyV2({
      tools: mockTools,
      identityPrompt,
      agentSteps,
      roundsLeft: 5,
      systemMessage,
      model,
    })

    expect(result.type).toBe("tool")
    if (result.type === "tool") {
      expect(result.toolName).toBe("todoWrite")
      expect(result.reasoning).toBeTruthy()
      expect(result.plan).toBeTruthy()
      // TODO: Weak assertions - toBeTruthy() doesn't verify content quality.
      // Should test that reasoning/plan actually relate to the task and tool.
    }
  })

  it("should terminate after completing todo operations", async () => {
    const systemMessage =
      "You are a helpful assistant that manages todo lists. Create and manage todo items as requested."

    // Simulate having already used todoWrite and todoRead
    const completedagentSteps: AgentSteps = [
      {
        type: "tool",
        name: "todoWrite",
        args: { todo: "buy groceries" },
        return: { data: "Todo written: buy groceries" },
        summary: "Added todo item",
      },
      {
        type: "tool",
        name: "todoWrite",
        args: { todo: "walk the dog" },
        return: { data: "Todo written: walk the dog" },
        summary: "Added todo item",
      },
      {
        type: "tool",
        name: "todoWrite",
        args: { todo: "finish project" },
        return: { data: "Todo written: finish project" },
        summary: "Added todo item",
      },
      {
        type: "tool",
        name: "todoRead",
        args: {},
        return: { data: ["buy groceries", "walk the dog", "finish project"] },
        summary: "Read current todos",
      },
    ]

    const result = await selectToolStrategyV2({
      tools: mockTools,
      identityPrompt,
      agentSteps: completedagentSteps,
      roundsLeft: 1, // Only 1 round left
      systemMessage,
      model,
    })

    expect(result.type).toBe("terminate")
    if (result.type === "terminate") {
      expect(result.reasoning.toLowerCase()).toMatch(/complete|finished|done|no further action|already/)
      // TODO: This assumes the AI will use the word "complete" in its reasoning.
      // AI responses are non-deterministic - it might say "finished", "done", etc.
    }
  })

  it("should avoid duplicate tool calls", async () => {
    const systemMessage = "You are a helpful assistant. Read the todo list."

    // Simulate having already read todos multiple times
    const duplicateagentSteps: AgentSteps = [
      {
        type: "tool",
        name: "todoRead",
        args: {},
        return: { data: ["buy groceries", "walk the dog"] },
        summary: "Read todos",
      },
      {
        type: "tool",
        name: "todoRead",
        args: {},
        return: { data: ["buy groceries", "walk the dog"] },
        summary: "Read todos again",
      },
      {
        type: "tool",
        name: "todoRead",
        args: {},
        return: { data: ["buy groceries", "walk the dog"] },
        summary: "Read todos yet again",
      },
    ]

    const result = await selectToolStrategyV2({
      tools: mockTools,
      identityPrompt,
      agentSteps: duplicateagentSteps,
      roundsLeft: 2,
      systemMessage,
      model,
    })

    // Should terminate due to repeated calls or select a different useful tool
    expect(result.type).toMatch(/terminate|tool/)
    if (result.type === "tool") {
      expect(result.toolName).not.toBe("todoRead")
    }
    // TODO: This test accepts multiple outcomes (terminate OR different tool).
    // It's not actually testing a specific behavior - just that it doesn't repeat.
    // Also relies on AI recognizing duplicate calls, which isn't guaranteed.
  })

  it("should handle locationDataManager tool properly", async () => {
    // TODO: This test doesn't verify that the AI generates valid parameters for
    // locationDataManager. Given the template string issues seen in other tests,
    // this is a critical gap. Should test parameter generation quality.
    const identityPrompt = "Please insert some sample locations into the database"

    const systemMessage = "You manage location data. Insert, update or delete locations as requested."

    const result = await selectToolStrategyV2({
      tools: mockTools,
      identityPrompt,
      agentSteps: [],
      roundsLeft: 5,
      systemMessage,
      model,
    })

    expect(result.type).toBe("tool")
    if (result.type === "tool") {
      expect(result.toolName).toBe("locationDataManager")
      expect(result.reasoning).toBeTruthy()
      expect(result.plan).toBeTruthy()
      // Plan should indicate proper usage of the tool
      expect(result.plan.toLowerCase()).toMatch(/insert|location|operation/)
    }
  })

  it("should terminate when no tools are available", async () => {
    const emptyTools: ToolSet = {}

    const result = await selectToolStrategyV2({
      tools: emptyTools,
      identityPrompt,
      agentSteps,
      roundsLeft: 5,
      systemMessage: "Help with todo management",
      model,
    })

    expect(result.type).toBe("terminate")
    if (result.type === "terminate") {
      expect(result.reasoning.toLowerCase()).toMatch(/no tools/)
      // TODO: Assumes AI will say "No tools available" - it might phrase differently.
      // Better to test the behavior (termination) rather than exact wording.
    }
  })

  it("should follow primary instruction with specific action verbs", async () => {
    // TODO: This test name suggests testing "action verb" recognition, but the test
    // doesn't actually verify this mechanism. It's just another tool selection test
    // that relies on AI interpretation.
    const identityPrompt = "Write down these important tasks"

    const actionSystemMessage = "Write and create todo items as requested by the user."

    const result = await selectToolStrategyV2({
      tools: mockTools,
      identityPrompt,
      agentSteps: [],
      roundsLeft: 5,
      systemMessage: actionSystemMessage,
      model,
    })

    // Prefer tool selection, but allow terminate due to LLM variability
    expect(["tool", "terminate"]).toContain(result.type)
    if (result.type === "tool") {
      expect(result.toolName).toBe("todoWrite")
      expect(result.reasoning).toBeTruthy()
    } else if (result.type === "terminate") {
      expect(result.reasoning).toBeTruthy()
    }
  })

  it("should handle low rounds left appropriately", async () => {
    const result = await selectToolStrategyV2({
      tools: mockTools,
      identityPrompt,
      agentSteps,
      roundsLeft: 1, // Only 1 round left
      systemMessage: "Create a todo list",
      model,
    })

    // Should either terminate or pick the most important tool
    expect(result.type).toBe("tool")
    if (result.type === "tool") {
      expect(result.toolName).toBe("todoWrite") // Most relevant for the task
    }
    // TODO: Another test that accepts multiple outcomes. It's not clear what behavior
    // we're actually testing - should it terminate or use a tool when rounds are low?
    // The test doesn't enforce consistent behavior.
  })
})
