import type { AgentSteps } from "@core/messages/pipeline/AgentStep.types"
import { getDefaultModels } from "@runtime/settings/models"
import type { ToolSet } from "ai"
import { beforeEach, describe, expect, it } from "vitest"
import { selectToolStrategyV2 } from "../../../messages/pipeline/selectTool/selectToolStrategyV2"

// Mock tools for testing
const mockTools: ToolSet = {
  todoWrite: {
    description: "Write a todo item to the todo list",
    parameters: {
      type: "object",
      properties: {
        todo: {
          type: "string",
          description: "The todo item to write",
        },
      },
      required: ["todo"],
    },
  },
  todoRead: {
    description: "Read the current todo list",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  locationDataManager: {
    description: "Manage location data operations",
    parameters: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          enum: ["insertLocations", "updateLocations", "deleteLocations"],
        },
        locationData: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              lat: { type: "number" },
              lng: { type: "number" },
            },
          },
        },
      },
      required: ["operation"],
    },
  },
}

describe("selectToolStrategyV2 Integration Tests", () => {
  let identityPrompt: string
  let agentSteps: AgentSteps
  const model = getDefaultModels().medium

  beforeEach(() => {
    identityPrompt =
      "Please create a simple todo list with items: buy groceries, walk the dog, finish project"
    agentSteps = []
  })

  it("should select todoWrite tool for todo creation task", async () => {
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
      expect(result.reasoning).toContain("complete")
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
  })

  it("should handle locationDataManager tool properly", async () => {
    const identityPrompt =
      "Please insert some sample locations into the database"

    const systemMessage =
      "You manage location data. Insert, update or delete locations as requested."

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
      expect(result.reasoning).toContain("No tools available")
    }
  })

  it("should follow primary instruction with specific action verbs", async () => {
    const identityPrompt = "Write down these important tasks"

    const actionSystemMessage =
      "Write and create todo items as requested by the user."

    const result = await selectToolStrategyV2({
      tools: mockTools,
      identityPrompt,
      agentSteps: [],
      roundsLeft: 5,
      systemMessage: actionSystemMessage,
      model,
    })

    // With specific action verbs that match available tools, should select appropriate tool
    expect(result.type).toBe("tool")
    if (result.type === "tool") {
      expect(result.toolName).toBe("todoWrite")
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
    expect(result.type).toMatch(/terminate|tool/)
    if (result.type === "tool") {
      expect(result.toolName).toBe("todoWrite") // Most relevant for the task
    }
  })
})
