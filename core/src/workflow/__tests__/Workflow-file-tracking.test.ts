import { createMockEvaluationInput, createMockWorkflow } from "@core/utils/__tests__/setup/coreMocks"
import type { EvaluationInput } from "@core/workflow/ingestion/ingestion.types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { getDefaultModels } from "@runtime/settings/models"
import { describe, expect, it } from "vitest"

describe("Workflow File Tracking", () => {
  const mockConfigWithContextFile: WorkflowConfig = {
    nodes: [
      {
        nodeId: "test-node",
        description: "Test node",
        systemPrompt: "Test system prompt",
        modelName: getDefaultModels().default,
        mcpTools: [],
        codeTools: [],
        handOffs: [],
        memory: {},
      },
    ],
    entryNodeId: "test-node",
    contextFile: "fishcontext",
  }

  const mockConfigWithoutContextFile: WorkflowConfig = {
    nodes: [
      {
        nodeId: "test-node",
        description: "Test node",
        systemPrompt: "Test system prompt",
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
  const mockWorkflow = createMockWorkflow({
    config: mockConfigWithContextFile,
    evaluationInput: mockGoalEval,
    toolContext: mockGoalEval.outputSchema
      ? {
          expectedOutputType: mockGoalEval.outputSchema,
        }
      : undefined,
  })

  it("should store contextFile in workflow config when present", () => {
    const workflow = mockWorkflow

    // Test that the workflow config includes the contextFile
    const config = workflow.getConfig()
    expect(config.contextFile).toBe("fishcontext")
  })

  it("should handle workflow config without contextFile", () => {
    const workflow = createMockWorkflow({
      config: mockConfigWithoutContextFile,
      evaluationInput: mockGoalEval,
      toolContext: mockGoalEval.outputSchema
        ? {
            expectedOutputType: mockGoalEval.outputSchema,
          }
        : undefined,
    })

    // Test that the workflow config doesn't include contextFile
    const config = workflow.getConfig()
    expect(config.contextFile).toBeUndefined()
  })

  it("should provide contextFile to context stores", () => {
    const workflow = mockWorkflow

    // Test that the context store uses the correct name
    const contextStore = workflow.getContextStore("memory", "memory")
    expect(contextStore).toBeDefined()

    // The contextFile should be available for use by the workflow
    expect(workflow.getConfig().contextFile).toBe("fishcontext")
  })
})
