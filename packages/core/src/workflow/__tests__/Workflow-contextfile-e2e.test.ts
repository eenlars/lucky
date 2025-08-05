import { buildMessages } from "@messages/create/buildMessages"
import { WorkflowMessage } from "@messages/WorkflowMessage"
import {
  createMockEvaluationInput,
  createMockWorkflowFile,
} from "@utils/__tests__/setup/coreMocks"
import type { EvaluationInput } from "@workflow/ingestion/ingestion.types"
import type { WorkflowConfig } from "@workflow/schema/workflow.types"
import { getModels } from "@utils/config/runtimeConfig"
import { describe, expect, it } from "vitest"
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
          modelName: getModels().default,
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
      toolContext: goalEval.expectedOutputSchema
        ? {
            expectedOutputType: goalEval.expectedOutputSchema,
          }
        : undefined,
    })

    // Verify the contextFile is accessible
    expect(workflow.getWFConfig().contextFile).toBe("fishcontext")
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
        prompt: "Hello, analyze this data",
        context: "Previous analysis results",
      },
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
    const contextFileMessage = messages.find((msg) =>
      (msg.content as string)?.includes("persistent context store named")
    )
    expect(contextFileMessage).toBeDefined()
    expect(contextFileMessage?.role).toBe("system")
    expect(contextFileMessage?.content).toContain("contextGet")
    expect(contextFileMessage?.content).toContain("contextSet")
    expect(contextFileMessage?.content).toContain("contextList")
    expect(contextFileMessage?.content).toContain("contextManage")

    // Check that the user message contains the correct content
    const userMessage = messages.find((msg) => msg.role === "user")
    expect(userMessage?.content).toContain("Hello, analyze this data")
    expect(userMessage?.content).toContain("Context: Previous analysis results")
    expect(userMessage?.content).toContain(
      "workflow_invocation_id:test-invocation-123"
    )

    // Verify all expected system messages are present
    const systemMessages = messages.filter((msg) => msg.role === "system")
    expect(systemMessages).toHaveLength(3) // contextFile, systemPrompt, nodeDescription

    const systemPromptMessage = systemMessages.find((msg) =>
      (msg.content as string).includes("You are a data analyst")
    )
    expect(systemPromptMessage).toBeDefined()

    const nodeDescMessage = systemMessages.find(
      (msg) => msg.content === "you are the following node: Data analysis node"
    )
    expect(nodeDescMessage).toBeDefined()
  })
})
