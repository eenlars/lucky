import { MODELS } from "@/utils/models/models"
import { describe, expect, it } from "vitest"

describe("Todo Tools Integration Test", () => {
  it("should execute todoWrite and todoRead workflow", async () => {
    // Import the todo tools directly
    const todoWrite = await import(
      "@/runtime/code_tools/todo-manager/tool-todo-write"
    )
    const todoRead = await import(
      "@/runtime/code_tools/todo-manager/tool-todo-read"
    )
    const { sendAI } = await import("@/core/messages/api/sendAI")

    const workflowInvocationId = `todo-integration-test-${Date.now()}`

    const mockContext = {
      workflowInvocationId,
      nodeId: "test-node",
      workflowFiles: [],
      expectedOutputType: undefined,
      workflowId: "test-workflow",
      mainWorkflowGoal: "Test todo integration workflow",
    }

    // Step 1: Use todoWrite to create a todo
    const writeResult = await todoWrite.default.execute(
      {
        todos: [
          {
            id: "test-1",
            content: "Integration test task",
            status: "pending" as const,
            priority: "high" as const,
          },
        ],
      },
      mockContext
    )

    expect(writeResult.success).toBe(true)
    expect(writeResult.data?.output?.success).toBe(true)
    console.log("TodoWrite result:", writeResult.data?.output?.message)

    // Step 2: Use todoRead to read back the todos
    const readResult = await todoRead.default.execute({}, mockContext)

    expect(readResult.success).toBe(true)
    expect(readResult.data?.output?.todos).toBeDefined()
    expect(readResult.data?.output?.todos.length).toBe(1)
    expect(readResult.data?.output?.todos[0].content).toBe(
      "Integration test task"
    )

    console.log("TodoRead result:", readResult.data?.output?.todos)

    // Step 3: Verify the workflow with AI
    const todoListContent = JSON.stringify(
      readResult.data?.output?.todos,
      null,
      2
    )

    const verification = await sendAI({
      model: MODELS.default,
      mode: "text",
      messages: [
        {
          role: "user",
          content: `
          Analyze this todo list data and determine if it contains valid todo information:
          
          Todo List: ${todoListContent}
          
          The todo list should contain at least one todo item with proper structure (id, content, status, priority).
          Respond with "SUCCESS" if the todo list is valid and contains todos, or "FAILURE" if it's invalid or empty.
          Include a brief explanation.
        `,
        },
      ],
    })

    expect(verification.success).toBe(true)
    expect(verification.data?.text).toContain("SUCCESS")

    console.log("Integration test verification:")
    console.log("- Todo list:", todoListContent)
    console.log("- AI verification:", verification.data?.text)
  }, 20000)

  it("should handle multiple todos in workflow", async () => {
    const todoWrite = await import(
      "@/runtime/code_tools/todo-manager/tool-todo-write"
    )
    const todoRead = await import(
      "@/runtime/code_tools/todo-manager/tool-todo-read"
    )

    const workflowInvocationId = `todo-multi-integration-test-${Date.now()}`

    const mockContext = {
      workflowInvocationId,
      nodeId: "test-node-multi",
      workflowFiles: [],
      expectedOutputType: undefined,
      workflowId: "test-workflow-multi",
      mainWorkflowGoal: "Test multiple todos integration workflow",
    }

    // Create multiple todos
    const writeResult = await todoWrite.default.execute(
      {
        todos: [
          {
            id: "multi-1",
            content: "First integration task",
            status: "completed" as const,
            priority: "high" as const,
          },
          {
            id: "multi-2",
            content: "Second integration task",
            status: "in_progress" as const,
            priority: "medium" as const,
          },
          {
            id: "multi-3",
            content: "Third integration task",
            status: "pending" as const,
            priority: "low" as const,
          },
        ],
      },
      mockContext
    )

    expect(writeResult.success).toBe(true)
    expect(writeResult.data?.output?.todos.length).toBe(3)

    // Read back the todos
    const readResult = await todoRead.default.execute({}, mockContext)

    expect(readResult.success).toBe(true)
    expect(readResult.data?.output?.todos.length).toBe(3)

    const todos = readResult.data?.output?.todos
    expect(todos?.some((t) => t.status === "completed")).toBe(true)
    expect(todos?.some((t) => t.status === "in_progress")).toBe(true)
    expect(todos?.some((t) => t.status === "pending")).toBe(true)

    console.log("Multi-todo test results:")
    console.log("- Created todos:", writeResult.data?.output?.todos.length)
    console.log("- Read todos:", readResult.data?.output?.todos.length)
    console.log(
      "- Todo statuses:",
      todos?.map((t) => t.status)
    )
  }, 15000)
})
