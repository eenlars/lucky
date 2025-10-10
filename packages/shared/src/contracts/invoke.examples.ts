/**
 * Example requests and responses for MCP JSON-RPC 2.0 workflow invocation
 * These examples serve as both documentation and test fixtures
 */

import type { InvokeRequest, InvokeResponse } from "./invoke"

/**
 * Example 1: Simple string input
 */
export const exampleStringInput: InvokeRequest = {
  jsonrpc: "2.0",
  id: "req_001",
  method: "workflow.invoke",
  params: {
    workflow_id: "wf_version_abc123",
    input: "What is the capital of France?",
    options: {
      goal: "Answer the geography question",
      trace: true,
    },
  },
}

/**
 * Example 2: Structured object input with schema validation
 */
export const exampleObjectInput: InvokeRequest = {
  jsonrpc: "2.0",
  id: "req_002",
  method: "workflow.invoke",
  params: {
    workflow_id: "wf_version_xyz789",
    input: {
      name: "John Doe",
      email: "john@example.com",
      age: 30,
      preferences: {
        newsletter: true,
        notifications: false,
      },
    },
    options: {
      goal: "Process user registration",
      timeoutMs: 30000,
      idempotencyKey: "unique-key-12345678",
    },
    auth: {
      bearer: "sk_live_1234567890abcdef",
    },
  },
}

/**
 * Example 3: Array input
 */
export const exampleArrayInput: InvokeRequest = {
  jsonrpc: "2.0",
  id: 123,
  method: "workflow.invoke",
  params: {
    workflow_id: "wf_version_batch001",
    input: [
      { id: 1, value: "alpha" },
      { id: 2, value: "beta" },
      { id: 3, value: "gamma" },
    ],
    options: {
      goal: "Process batch items",
    },
  },
}

/**
 * Example Success Response
 */
export const exampleSuccessResponse: InvokeResponse = {
  jsonrpc: "2.0",
  id: "req_001",
  result: {
    status: "ok",
    output: "The capital of France is Paris.",
    meta: {
      requestId: "mcp_invoke_xyz123",
      workflow_id: "wf_version_abc123",
      startedAt: "2024-01-15T10:30:00.000Z",
      finishedAt: "2024-01-15T10:30:05.234Z",
      traceId: "inv_789abc",
      invocationType: "http",
    },
  },
}

/**
 * Example Error Response: Invalid Request
 */
export const exampleErrorInvalidRequest: InvokeResponse = {
  jsonrpc: "2.0",
  id: "unknown",
  error: {
    code: -32600,
    message: "Invalid JSON-RPC request format",
    data: {
      issues: [
        {
          path: ["params", "workflow_id"],
          message: "Required",
        },
      ],
    },
  },
}

/**
 * Example Error Response: Authentication Failed
 */
export const exampleErrorAuth: InvokeResponse = {
  jsonrpc: "2.0",
  id: "req_003",
  error: {
    code: -32000,
    message:
      "Missing authentication. Provide either Authorization header ('Bearer <token>') or params.auth.bearer field",
  },
}

/**
 * Example Error Response: Workflow Not Found
 */
export const exampleErrorNotFound: InvokeResponse = {
  jsonrpc: "2.0",
  id: "req_004",
  error: {
    code: -32001,
    message: "Workflow wf_version_nonexistent not found",
  },
}

/**
 * Example Error Response: Input Validation Failed
 */
export const exampleErrorValidation: InvokeResponse = {
  jsonrpc: "2.0",
  id: "req_005",
  error: {
    code: -32002,
    message: "Input validation failed",
    data: {
      errors: [
        {
          path: "/email",
          message: 'must match format "email"',
          params: { format: "email" },
        },
        {
          path: "/age",
          message: "must be >= 18",
          params: { comparison: ">=", limit: 18 },
        },
      ],
      summary: '/email must match format "email"; /age must be >= 18',
    },
  },
}

/**
 * Example Error Response: Workflow Execution Failed
 */
export const exampleErrorExecution: InvokeResponse = {
  jsonrpc: "2.0",
  id: "req_006",
  error: {
    code: -32003,
    message: "Workflow execution failed",
    data: {
      error: "Node 'validator' failed: API rate limit exceeded",
    },
  },
}

/**
 * Example cURL command for testing
 */
export const exampleCurlCommand = `
curl -X POST https://api.example.com/api/v1/invoke \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk_live_1234567890abcdef" \\
  -H "Idempotency-Key: unique-request-123" \\
  -d '{
    "jsonrpc": "2.0",
    "id": "req_001",
    "method": "workflow.invoke",
    "params": {
      "workflow_id": "wf_version_abc123",
      "input": "What is 2+2?",
      "options": {
        "goal": "Solve math problem",
        "trace": true
      }
    }
  }'
`.trim()

/**
 * Example workflow config with inputSchema
 */
export const exampleWorkflowConfigWithSchema = {
  nodes: [
    {
      nodeId: "entry",
      description: "User registration validator",
      systemPrompt: "Validate and process user registration",
      modelName: "gpt-4",
      mcpTools: [],
      codeTools: [],
      handOffs: [],
    },
  ],
  entryNodeId: "entry",
  inputSchema: {
    type: "object" as const,
    properties: {
      name: {
        type: "string",
        minLength: 1,
        maxLength: 100,
      },
      email: {
        type: "string",
        format: "email",
      },
      age: {
        type: "number",
        minimum: 18,
        maximum: 120,
      },
      preferences: {
        type: "object",
        properties: {
          newsletter: { type: "boolean" },
          notifications: { type: "boolean" },
        },
        required: ["newsletter"],
      },
    },
    required: ["name", "email", "age"],
  },
  outputSchema: {
    type: "object" as const,
    properties: {
      userId: { type: "string" },
      status: { type: "string" },
      message: { type: "string" },
    },
  },
}
