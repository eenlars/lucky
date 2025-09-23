/**
 * Test workflow demonstrating Claude Code SDK integration.
 * 
 * This workflow shows how to configure nodes to use either:
 * - Claude SDK (with useClaudeSDK: true)
 * - Custom pipeline (default)
 * - Both in the same workflow
 */

import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"

export const sdkTestWorkflow: WorkflowConfig = {
  nodes: [
    {
      nodeId: "sdk-analyzer",
      description: "Analyze code using Claude SDK with tools",
      systemPrompt: `You are a code analysis expert.
        Analyze the provided code and identify:
        1. Main functionality
        2. Potential issues
        3. Suggestions for improvement`,
      modelName: "claude-3-sonnet-latest",
      useClaudeSDK: true,
      sdkConfig: {
        model: "sonnet",
        allowedTools: ["Read", "Grep", "Glob"],
        skipPermissions: false,
        timeout: 60000
      },
      mcpTools: [],
      codeTools: [],
      handOffs: ["custom-processor"],
      memory: {
        analysis_type: "code_review",
        focus_areas: "security,performance,maintainability"
      }
    },
    {
      nodeId: "custom-processor",
      description: "Process analysis with custom tools",
      systemPrompt: `You are a code improvement specialist.
        Based on the analysis provided:
        1. Create actionable recommendations
        2. Prioritize by importance
        3. Suggest specific code changes`,
      modelName: "gpt-4o-mini",
      useClaudeSDK: false, // Uses custom pipeline
      mcpTools: [],
      codeTools: ["contextGet", "contextSet"], // Custom tools
      handOffs: ["sdk-formatter"],
      memory: {
        output_format: "markdown",
        include_examples: "true"
      }
    },
    {
      nodeId: "sdk-formatter",
      description: "Format final report using Claude SDK",
      systemPrompt: `You are a technical writer.
        Format the recommendations into a professional report with:
        - Executive summary
        - Detailed findings
        - Implementation roadmap`,
      modelName: "claude-3-haiku-latest",
      useClaudeSDK: true,
      sdkConfig: {
        model: "haiku", // Using faster model for formatting
        skipPermissions: true,
        timeout: 30000
      },
      mcpTools: [],
      codeTools: [],
      handOffs: [],
      handOffType: "sequential"
    }
  ],
  entryNodeId: "sdk-analyzer",
  memory: {
    workflow_purpose: "code_analysis_pipeline",
    sdk_integration_test: "true",
    created_by: "sdk_integration"
  }
}

/**
 * Example usage with evaluation input
 */
export const sdkTestEvaluationInput = {
  workflowId: "sdk-integration-test",
  inputs: [
    {
      input: `
function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price * items[i].quantity;
  }
  return total;
}
      `,
      expectedOutput: "Analysis with recommendations for improving the calculateTotal function"
    },
    {
      input: `
async function fetchUserData(userId) {
  const response = await fetch(\`/api/users/\${userId}\`);
  const data = await response.json();
  return data;
}
      `,
      expectedOutput: "Analysis identifying missing error handling and suggestions for improvement"
    }
  ]
}

/**
 * Test configuration demonstrating SDK session preservation
 */
export const sdkSessionTestWorkflow: WorkflowConfig = {
  nodes: [
    {
      nodeId: "session-start",
      description: "Start a conversation with Claude SDK",
      systemPrompt: "You are a helpful assistant. Remember information across our conversation.",
      modelName: "claude-3-sonnet-latest",
      useClaudeSDK: true,
      sdkConfig: {
        model: "sonnet",
        skipPermissions: true
      },
      mcpTools: [],
      codeTools: [],
      handOffs: ["session-continue"]
    },
    {
      nodeId: "session-continue",
      description: "Continue the conversation (SDK should preserve context)",
      systemPrompt: "Continue helping based on our previous discussion.",
      modelName: "claude-3-sonnet-latest",
      useClaudeSDK: true,
      sdkConfig: {
        model: "sonnet",
        skipPermissions: true
      },
      mcpTools: [],
      codeTools: [],
      handOffs: []
    }
  ],
  entryNodeId: "session-start"
}