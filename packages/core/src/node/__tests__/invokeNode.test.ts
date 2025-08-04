import { describe, expect, it } from "vitest"

import { MODELS } from "@/runtime/settings/constants"
import type { WorkflowNodeConfig } from "@workflow/schema/workflow.types"
import { invokeNode } from "../invokeNode"

describe("invokeNode", () => {
  it("should invoke a simple node and return result", async () => {
    // Create a minimal node configuration
    const nodeConfig: WorkflowNodeConfig = {
      nodeId: "test-node",
      description: "A test node for unit testing",
      systemPrompt:
        "You are a helpful assistant. Just respond with the input you received.",
      modelName: MODELS.nano,
      mcpTools: [],
      codeTools: [],
      handOffs: ["end"], // Single node invocation should end here
      memory: {},
    }

    const prompt = "Hello, this is a test prompt."

    // Invoke the node with database persistence skipped for testing
    const result = await invokeNode({
      nodeConfig,
      prompt,
      skipDatabasePersistence: true,
    })

    // Verify the result structure
    expect(result.nodeInvocationId).toBeDefined()
    expect(result.nodeInvocationFinalOutput).toBeDefined()
    expect(typeof result.nodeInvocationFinalOutput).toBe("string")
    expect(result.nodeInvocationFinalOutput.length).toBeGreaterThan(0)

    console.log("Node output:", result.nodeInvocationFinalOutput)
  }, 30000) // 30 second timeout for AI calls
})
