/**
 * Manual test script to verify maxSteps functionality
 * Run with: bun run test-maxsteps.ts
 */

import { WorkFlowNode } from "@core/node/WorkFlowNode"
import { ToolManager } from "@core/node/toolManager"
import type { WorkflowNodeConfig } from "@lucky/shared"

// Set up environment
process.env.USE_MOCK_PERSISTENCE = "true"

// Create a test node config with maxSteps
const nodeConfigWithMaxSteps: WorkflowNodeConfig = {
  nodeId: "test-maxsteps",
  description: "Test node with maxSteps=2",
  systemPrompt: "You are a helpful assistant. Use tools multiple times if needed to thoroughly answer the question.",
  modelName: "gpt-4o-mini",
  mcpTools: [],
  codeTools: ["math"], // Simple tool that will be called
  handOffs: [],
  memory: null,
  maxSteps: 2, // ← This limits execution to 2 steps
}

// Create a test node WITHOUT maxSteps (should use global default)
const nodeConfigNoMaxSteps: WorkflowNodeConfig = {
  nodeId: "test-no-maxsteps",
  description: "Test node without maxSteps",
  systemPrompt: "You are a helpful assistant.",
  modelName: "gpt-4o-mini",
  mcpTools: [],
  codeTools: ["math"],
  handOffs: [],
  memory: null,
  // maxSteps not set - should use global default
}

async function testMaxSteps() {
  console.log("\n=== Testing maxSteps Functionality ===\n")

  try {
    // Test 1: Node with maxSteps=2
    console.log("Test 1: Node with maxSteps=2")
    console.log("Expected: Should stop after 2 steps\n")

    const toolManager1 = new ToolManager()
    const node1 = new WorkFlowNode(nodeConfigWithMaxSteps, toolManager1)

    const result1 = await node1.invoke({
      workflowMessageIncoming: {
        from: "test",
        to: "test-maxsteps",
        payload: {
          type: "text",
          data: "Calculate 5 + 3, then multiply by 2, then add 10. Show all steps.",
        },
      },
      mainWorkflowGoal: "Test maxSteps with multiple calculations",
      invocationId: "test-1",
      toolStrategyOverride: "v3", // Use V3 for better tool selection
    })

    console.log("Result 1:", result1.type)
    console.log("Agent steps:", result1.agentSteps?.length || 0)
    console.log("Tool calls:", result1.agentSteps?.filter(s => s.type === "tool").length || 0)

    // Test 2: Node without maxSteps (uses global default)
    console.log("\n\nTest 2: Node without maxSteps (uses global default)")
    console.log("Expected: Should use global experimentalMultiStepLoopMaxRounds\n")

    const toolManager2 = new ToolManager()
    const node2 = new WorkFlowNode(nodeConfigNoMaxSteps, toolManager2)

    const result2 = await node2.invoke({
      workflowMessageIncoming: {
        from: "test",
        to: "test-no-maxsteps",
        payload: {
          type: "text",
          data: "Calculate 10 + 20",
        },
      },
      mainWorkflowGoal: "Test default maxSteps behavior",
      invocationId: "test-2",
      toolStrategyOverride: "v3",
    })

    console.log("Result 2:", result2.type)
    console.log("Agent steps:", result2.agentSteps?.length || 0)
    console.log("Tool calls:", result2.agentSteps?.filter(s => s.type === "tool").length || 0)

    console.log("\n=== Tests Complete ===\n")
    console.log("✓ Both nodes executed successfully")
    console.log("✓ Check the 'Agent steps' and 'Tool calls' counts above")
    console.log("✓ Node with maxSteps=2 should have ≤ 2 tool calls")
  } catch (error) {
    console.error("\n❌ Test failed:", error)
    process.exit(1)
  }
}

// Run the test
testMaxSteps()
