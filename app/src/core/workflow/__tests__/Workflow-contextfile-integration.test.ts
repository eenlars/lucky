import { buildSimpleMessage } from "@/core/messages/create/buildSimpleMessage"
import { createMockWorkflowFile } from "@/core/utils/__tests__/setup/coreMocks"
import { describe, expect, it } from "vitest"

describe("ContextFile Integration", () => {
  it("should inject contextFile information into system messages", () => {
    const messages = buildSimpleMessage({
      message: "Test message",
      nodeDescription: "Test node",
      systemPrompt: "You are a test agent",
      workflowFiles: [createMockWorkflowFile("fishcontext")],
      debug: false,
    })

    // Should have 2 messages: merged system message and user message
    expect(messages).toHaveLength(2)

    // Check the merged system message contains all expected elements
    expect(messages[0].role).toBe("system")
    expect(messages[0].content).toContain("persistent context store named")
    expect(messages[0].content).toContain("fishcontext")
    expect(messages[0].content).toContain("contextGet")
    expect(messages[0].content).toContain("contextSet")
    expect(messages[0].content).toContain("contextList")
    expect(messages[0].content).toContain("contextManage")
    expect(messages[0].content).toContain(
      "you are the following node: Test node"
    )
    expect(messages[0].content).toContain("You are a test agent")

    // Check the user message is last
    expect(messages[1]).toEqual({
      role: "user",
      content: "Test message\nworkflow_invocation_id:test-invocation-123",
    })
  })

  it("should not inject contextFile message when contextFile is not provided", () => {
    const messages = buildSimpleMessage({
      message: "Test message",
      nodeDescription: "Test node",
      systemPrompt: "You are a test agent",
      debug: false,
      workflowFiles: [],
    })

    // Should have 2 messages: merged system message and user message (no contextFile)
    expect(messages).toHaveLength(2)

    // Should not contain contextFile message
    const contextFileMessage = messages.find((m) =>
      (m.content as string)?.includes("persistent context store")
    )
    expect(contextFileMessage).toBeUndefined()
  })

  it("should handle contextFile with context from payload", () => {
    const messages = buildSimpleMessage({
      message: "Test message",
      context: "Some payload context",
      workflowFiles: [createMockWorkflowFile("fishcontext")],
      debug: false,
    })

    // Check user message includes both the message and context
    const userMessage = messages.find((m) => m.role === "user")
    expect(userMessage?.content).toContain("Test message")
    expect(userMessage?.content).toContain("Context: Some payload context")
    expect(userMessage?.content).toContain(
      "workflow_invocation_id:test-invocation-123"
    )

    // Check contextFile system message exists
    const contextFileMessage = messages.find((m) =>
      (m.content as string)?.includes("persistent context store named")
    )
    expect(contextFileMessage).toBeDefined()
  })
})
