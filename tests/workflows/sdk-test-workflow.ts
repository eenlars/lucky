/**
 * Test workflow demonstrating official Anthropic SDK integration.
 *
 * This workflow shows how to configure nodes to use either:
 * - Official Anthropic SDK (with useClaudeSDK: true)
 * - Custom pipeline (default)
 * - Both in the same workflow
 */

import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"

export const sdkTestWorkflow: WorkflowConfig = {
  nodes: [
    {
      nodeId: "sdk-analyzer",
      description: "Analyze code using official Anthropic SDK",
      systemPrompt: `You are a code analysis expert.
        Analyze the provided code and identify:
        1. Main functionality
        2. Potential issues
        3. Suggestions for improvement`,
      modelName: "claude-3-sonnet-latest",
      useClaudeSDK: true,
      sdkConfig: {
        model: "sonnet",
        maxTokens: 4096,
        temperature: 0.5,
        timeout: 60000,
      },
      mcpTools: [],
      codeTools: [],
      handOffs: ["custom-processor"],
      memory: {
        analysis_type: "code_review",
        focus_areas: "security,performance,maintainability",
      },
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
        include_examples: "true",
      },
    },
    {
      nodeId: "sdk-formatter",
      description: "Format final report using official SDK with fast model",
      systemPrompt: `You are a technical writer.
        Format the recommendations into a professional report with:
        - Executive summary
        - Detailed findings
        - Implementation roadmap`,
      modelName: "claude-3-haiku-latest",
      useClaudeSDK: true,
      sdkConfig: {
        model: "haiku", // Using faster model for formatting
        maxTokens: 2048,
        temperature: 0.3,
        timeout: 30000,
      },
      mcpTools: [],
      codeTools: [],
      handOffs: [],
      handOffType: "sequential",
    },
  ],
  entryNodeId: "sdk-analyzer",
  memory: {
    workflow_purpose: "code_analysis_pipeline",
    sdk_integration_test: "true",
    created_by: "sdk_integration",
  },
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
      expectedOutput: "Analysis with recommendations for improving the calculateTotal function",
    },
    {
      input: `
async function fetchUserData(userId) {
  const response = await fetch(\`/api/users/\${userId}\`);
  const data = await response.json();
  return data;
}
      `,
      expectedOutput: "Analysis identifying missing error handling and suggestions for improvement",
    },
  ],
}

/**
 * Test configuration demonstrating SDK conversation flow
 * Note: Official SDK creates new conversations per request (stateless)
 */
export const sdkConversationTestWorkflow: WorkflowConfig = {
  nodes: [
    {
      nodeId: "conversation-start",
      description: "Start a conversation with official Anthropic SDK",
      systemPrompt: "You are a helpful assistant providing detailed technical explanations.",
      modelName: "claude-3-sonnet-latest",
      useClaudeSDK: true,
      sdkConfig: {
        model: "sonnet",
        maxTokens: 4096,
        temperature: 0.7,
      },
      mcpTools: [],
      codeTools: [],
      handOffs: ["conversation-continue"],
    },
    {
      nodeId: "conversation-continue",
      description: "Continue the conversation (context passed via workflow)",
      systemPrompt: "Continue helping with technical explanations, building on previous context.",
      modelName: "claude-3-sonnet-latest",
      useClaudeSDK: true,
      sdkConfig: {
        model: "sonnet",
        maxTokens: 4096,
        temperature: 0.7,
      },
      mcpTools: [],
      codeTools: [],
      handOffs: [],
    },
  ],
  entryNodeId: "conversation-start",
}
