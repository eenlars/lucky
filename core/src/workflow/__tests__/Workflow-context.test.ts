import { createMockEvaluationInput } from "@core/utils/__tests__/setup/coreMocks"
import { getDefaultModels } from "@runtime/settings/models"
import type { EvaluationInput } from "@core/workflow/ingestion/ingestion.types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { describe, expect, it } from "vitest"
import { Workflow } from "../Workflow"

describe("Workflow ContextStore Integration", () => {
  const mockConfig: WorkflowConfig = {
    nodes: [
      {
        nodeId: "test-node",
        description: "Test node",
        systemPrompt: "Test system prompt",
        modelName: getDefaultModels().default,
        mcpTools: [],
        codeTools: [],
        handOffs: ["test-node2"],
        memory: {},
      },
      {
        nodeId: "test-node2",
        description: "Test node 2",
        systemPrompt: "Test system prompt 2",
        modelName: getDefaultModels().default,
        mcpTools: [],
        codeTools: [],
        handOffs: [],
        memory: {},
      },
    ],
    entryNodeId: "test-node",
  }

  const mockGoalEval: EvaluationInput = createMockEvaluationInput()

  const createWorkflow = (config: WorkflowConfig, evaluationInput: EvaluationInput) => {
    return Workflow.create({
      config,
      evaluationInput,
      toolContext: undefined,
    })
  }

  it("should create memory context stores before setup", () => {
    const workflow = createWorkflow(mockConfig, mockGoalEval)

    const memory = workflow.getContextStore("memory", "memory")
    expect(memory).toBeDefined()

    const customContext = workflow.getContextStore("custom", "memory")
    expect(customContext).toBeDefined()

    expect(workflow.getContextStoreNames()).toEqual(["memory_0", "custom_0"])
  })

  it("should reuse existing context stores", () => {
    const workflow = createWorkflow(mockConfig, mockGoalEval)

    const memory1 = workflow.getContextStore("memory", "memory")
    const memory2 = workflow.getContextStore("memory", "memory")

    expect(memory1).toBe(memory2)
    expect(workflow.getContextStoreNames()).toEqual(["memory_0"])
  })

  it("should store and retrieve data in memory", async () => {
    const workflow = createWorkflow(mockConfig, mockGoalEval)
    const memory = workflow.getContextStore("memory", "memory")

    await memory.set("workflow", "fish-config", { species: "salmon" })
    await memory.set("node", "fish-count", 42)

    expect(await memory.get("workflow", "fish-config")).toEqual({
      species: "salmon",
    })
    expect(await memory.get("node", "fish-count")).toBe(42)

    const workflowKeys = await memory.list("workflow")
    const nodeKeys = await memory.list("node")

    expect(workflowKeys).toContain("fish-config")
    expect(nodeKeys).toContain("fish-count")
  })

  it("should throw error for supabase stores before setup", () => {
    const workflow = createWorkflow(mockConfig, mockGoalEval)

    expect(() => workflow.getContextStore("supabase")).toThrow(
      "Workflow invocation must be created for index 0 before creating Supabase context stores"
    )
  })

  it("should isolate context stores between workflow instances", async () => {
    const workflow1 = createWorkflow(mockConfig, mockGoalEval)
    const workflow2 = createWorkflow(mockConfig, mockGoalEval)

    const memory1 = workflow1.getContextStore("memory", "memory")
    const memory2 = workflow2.getContextStore("memory", "memory")

    await memory1.set("workflow", "data", "workflow1-value")
    await memory2.set("workflow", "data", "workflow2-value")

    expect(await memory1.get("workflow", "data")).toBe("workflow1-value")
    expect(await memory2.get("workflow", "data")).toBe("workflow2-value")

    // They should be different instances
    expect(memory1).not.toBe(memory2)
  })
})
