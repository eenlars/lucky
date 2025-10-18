#!/usr/bin/env tsx

/**
 * Test script to verify workflow invocations are being saved to the database.
 *
 * Usage:
 *   cd packages/core
 *   tsx scripts/test-invocation.ts
 */

import { invokeWorkflow } from "@core/workflow/runner/invokeWorkflow"
import type { InvocationInput } from "@core/workflow/runner/types"

async function main() {
  console.log("🧪 Testing workflow invocation saving...\n")

  // Simple test workflow config
  const testWorkflow = {
    __schema_version: 1,
    entryNodeId: "start",
    nodes: [
      {
        nodeId: "start",
        description: "Entry node for test workflow",
        systemPrompt: "You are a helpful assistant.",
        userPromptTemplate: "{{input}}",
        modelName: "claude-3-5-sonnet-20241022",
        codeTools: [],
        mcpTools: [],
        handOffs: [],
        outputSchema: null,
      },
    ],
  }

  const input: InvocationInput = {
    dslConfig: testWorkflow,
    evalInput: {
      type: "prompt-only",
      goal: "Say hello and introduce yourself in one sentence.",
      workflowId: "test_invocation_debug",
    },
  }

  console.log("📋 Invoking workflow with prompt-only input...")
  console.log("   Goal:", input.evalInput.goal)
  console.log("\n🔍 Watch for DEBUG logs below:\n")

  try {
    const result = await invokeWorkflow(input)

    if (result.success) {
      console.log("\n✅ Workflow invocation completed successfully!")
      console.log("   Result:", JSON.stringify(result.data?.[0]?.queueRunResult?.finalWorkflowOutput, null, 2))
      console.log("\n💾 Check your database WorkflowInvocation table for the new record.")
      console.log("   Look for wf_invocation_id that matches the debug logs above.")
      process.exit(0)
    } else {
      console.error("\n❌ Workflow invocation failed:", result.error)
      process.exit(1)
    }
  } catch (error) {
    console.error("\n❌ Test failed with error:", error)
    process.exit(1)
  }
}

main()
