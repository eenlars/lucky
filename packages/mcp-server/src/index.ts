#!/usr/bin/env node
import { randomUUID } from "node:crypto"
import type { IncomingHttpHeaders } from "node:http"
import dotenv from "dotenv"
import { FastMCP } from "fastmcp"
import { z } from "zod"

dotenv.config({ debug: false, quiet: true })

interface SessionData {
  luckyApiKey?: string
  [key: string]: unknown
}

interface JsonRpcError {
  code: number
  message: string
  data?: unknown
}

interface JsonRpcResponse {
  jsonrpc?: string
  id?: string | number
  result?: unknown
  error?: JsonRpcError
}

function extractApiKey(headers: IncomingHttpHeaders): string | undefined {
  const headerAuth = headers.authorization
  const headerApiKey = (headers["x-lucky-api-key"] || headers["x-api-key"]) as string | string[] | undefined

  if (headerApiKey) {
    return Array.isArray(headerApiKey) ? headerApiKey[0] : headerApiKey
  }

  if (typeof headerAuth === "string" && headerAuth.toLowerCase().startsWith("bearer ")) {
    return headerAuth.slice(7).trim()
  }

  return undefined
}

const server = new FastMCP<SessionData>({
  name: "lucky-mcp",
  version: "3.0.0",
  roots: { enabled: false },
  authenticate: async (request: {
    headers: IncomingHttpHeaders
  }): Promise<SessionData> => {
    if (process.env.CLOUD_SERVICE === "true") {
      const apiKey = extractApiKey(request.headers)

      if (!apiKey) {
        throw new Error("Lucky API key is required")
      }
      return { luckyApiKey: apiKey }
    }
    // For self-hosted instances, API key is optional if LUCKY_API_URL is provided
    if (!process.env.LUCKY_API_KEY && !process.env.LUCKY_API_URL) {
      console.error("Either LUCKY_API_KEY or LUCKY_API_URL must be provided")
      process.exit(1)
    }
    return { luckyApiKey: process.env.LUCKY_API_KEY }
  },
  // Lightweight health endpoint for LB checks
  health: {
    enabled: true,
    message: "ok",
    path: "/health",
    status: 200,
  },
})

function asText(data: unknown): string {
  return JSON.stringify(data, null, 2)
}

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Get and validate API URL
 */
function getApiUrl(): string {
  const url = process.env.LUCKY_API_URL || "http://localhost:3000"
  try {
    new URL(url)
    return url
  } catch {
    throw new Error(`Invalid LUCKY_API_URL environment variable: ${url}`)
  }
}

// ============================================================================
// WORKFLOW MANAGEMENT TOOLS (Phase 2)
// ============================================================================

server.addTool({
  name: "lucky_list_workflows",
  description: `
List all workflows available to the authenticated user.

**Returns:** Array of workflows with metadata:
- workflow_id: Unique workflow identifier (use this with lucky_run_workflow)
- name: Human-readable workflow name
- description: Workflow purpose and behavior
- inputSchema: JSONSchema7 defining expected input structure
- outputSchema: JSONSchema7 defining expected output structure
- created_at: ISO timestamp of workflow creation

**Example Response:**
\`\`\`json
[
  {
    "workflow_id": "wf_research_paper",
    "name": "Research Paper Generator",
    "description": "Generates academic research papers on specified topics",
    "inputSchema": {
      "type": "object",
      "properties": {
        "topic": { "type": "string", "minLength": 1 }
      },
      "required": ["topic"]
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "paper": { "type": "string" },
        "citations": { "type": "array" }
      }
    },
    "created_at": "2025-01-15T10:30:00Z"
  }
]
\`\`\`

**Note:** Requires luckyApiKey to be configured in MCP settings.
  `,
  parameters: z.object({}),
  execute: async (_args: unknown, { session }: { session?: SessionData }): Promise<string> => {
    const apiKey = session?.luckyApiKey
    if (!apiKey) {
      throw new Error("API key required. Configure luckyApiKey in MCP settings with your Lucky API key.")
    }

    const apiUrl = getApiUrl()

    const response = await fetchWithTimeout(`${apiUrl}/api/user/workflows`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Invalid API key. Please check your MCP configuration.")
      }
      throw new Error(`Failed to list workflows: ${response.statusText}`)
    }

    let workflows: unknown
    try {
      workflows = await response.json()
    } catch {
      throw new Error(`Backend returned invalid JSON response (status ${response.status})`)
    }

    return asText(workflows)
  },
})

server.addTool({
  name: "lucky_run_workflow",
  description: `
Execute a workflow with provided input data.

**Usage:**
1. Call lucky_list_workflows to discover available workflows
2. Check the workflow's inputSchema to understand required input format
3. Call lucky_run_workflow with workflow_id and properly formatted input

**Execution Modes:**
- **Sync mode** (timeoutMs ≤ 30s): Returns workflow output immediately
- **Async mode** (timeoutMs > 30s): Returns invocation_id for polling with lucky_check_status

**Example:**
\`\`\`json
{
  "workflow_id": "wf_research_paper",
  "input": { "topic": "AI Safety" },
  "options": { "timeoutMs": 30000, "trace": false }
}
\`\`\`

**Error Codes:**
- -32001: Workflow not found
- -32002: Input validation failed (check inputSchema)
- -32003: Workflow execution failed
- -32004: Execution timeout

**Parameters:**
- workflow_id: Workflow identifier from lucky_list_workflows
- input: Input data matching the workflow's inputSchema
- options: (optional) Execution options
  - timeoutMs: Max execution time in milliseconds (default: 30000, max: 600000)
  - trace: Enable detailed execution tracing (default: false)
  `,
  parameters: z.object({
    workflow_id: z.string().describe("Workflow identifier from lucky_list_workflows"),
    input: z.unknown().describe("Input data matching the workflow's inputSchema"),
    options: z
      .object({
        timeoutMs: z.number().max(600000).optional().describe("Max execution time in milliseconds"),
        trace: z.boolean().optional().describe("Enable detailed execution tracing"),
      })
      .optional(),
  }),
  execute: async (args: unknown, { session }: { session?: SessionData }): Promise<string> => {
    const apiKey = session?.luckyApiKey
    if (!apiKey) {
      throw new Error("API key required. Configure luckyApiKey in MCP settings with your Lucky API key.")
    }

    interface RunWorkflowOptions {
      timeoutMs?: number
      trace?: boolean
    }

    const apiUrl = getApiUrl()
    const { workflow_id, input, options } = args as {
      workflow_id: string
      input: unknown
      options?: RunWorkflowOptions
    }

    // Construct JSON-RPC request with unique ID
    const rpcRequest = {
      jsonrpc: "2.0",
      id: randomUUID(),
      method: "workflow.invoke",
      params: {
        workflow_id,
        input,
        options: options || {},
      },
    }

    const response = await fetchWithTimeout(`${apiUrl}/api/v1/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(rpcRequest),
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Invalid API key. Please check your MCP configuration.")
      }
      throw new Error(`Failed to invoke workflow: ${response.statusText}`)
    }

    let rpcResponse: JsonRpcResponse
    try {
      rpcResponse = (await response.json()) as JsonRpcResponse
    } catch {
      throw new Error(`Backend returned invalid JSON response (status ${response.status})`)
    }

    // Check for JSON-RPC error
    if (rpcResponse.error) {
      const errorMessages: Record<number, string> = {
        [-32001]: "Workflow not found or you don't have access to it",
        [-32002]: "Input validation failed - check the workflow's inputSchema",
        [-32003]: "Workflow execution failed",
        [-32004]: "Workflow execution timed out",
      }

      const message = errorMessages[rpcResponse.error.code] || rpcResponse.error.message
      throw new Error(`Workflow error: ${message}`)
    }

    return asText(rpcResponse.result)
  },
})

server.addTool({
  name: "lucky_check_status",
  description: `
Check the status of a workflow execution.

**States:**
- **running**: Workflow is currently executing
- **completed**: Workflow finished successfully (output available)
- **failed**: Workflow encountered an error
- **cancelled**: Workflow was cancelled by user
- **cancelling**: Cancellation in progress
- **not_found**: Invalid invocation_id

**Usage:** Poll this tool after calling lucky_run_workflow in async mode (timeoutMs > 30s).

**Example Response:**
\`\`\`json
{
  "state": "completed",
  "invocationId": "inv_abc123",
  "createdAt": "2025-01-15T10:30:00Z",
  "output": {
    "paper": "Comprehensive analysis of AI Safety...",
    "citations": [...]
  }
}
\`\`\`

**Parameters:**
- invocation_id: Invocation identifier from lucky_run_workflow
  `,
  parameters: z.object({
    invocation_id: z.string().describe("Invocation identifier from lucky_run_workflow"),
  }),
  execute: async (args: unknown, { session }: { session?: SessionData }): Promise<string> => {
    const apiKey = session?.luckyApiKey
    if (!apiKey) {
      throw new Error("API key required. Configure luckyApiKey in MCP settings with your Lucky API key.")
    }

    const apiUrl = getApiUrl()
    const { invocation_id } = args as { invocation_id: string }

    const response = await fetchWithTimeout(`${apiUrl}/api/workflow/status/${invocation_id}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Invalid API key. Please check your MCP configuration.")
      }
      if (response.status === 404) {
        throw new Error(`Workflow execution not found: ${invocation_id}`)
      }
      throw new Error(`Failed to check status: ${response.statusText}`)
    }

    let status: unknown
    try {
      status = await response.json()
    } catch {
      throw new Error(`Backend returned invalid JSON response (status ${response.status})`)
    }

    return asText(status)
  },
})

server.addTool({
  name: "lucky_cancel_workflow",
  description: `
Cancel a running workflow execution.

**Usage:** Provide the invocation_id from lucky_run_workflow or lucky_check_status.

**Note:** Cancellation is graceful and may take time to complete. Check status with lucky_check_status to confirm cancellation.

**Example:**
\`\`\`json
{
  "invocation_id": "inv_abc123"
}
\`\`\`

**Parameters:**
- invocation_id: Invocation identifier to cancel
  `,
  parameters: z.object({
    invocation_id: z.string().describe("Invocation identifier to cancel"),
  }),
  execute: async (args: unknown, { session }: { session?: SessionData }): Promise<string> => {
    const apiKey = session?.luckyApiKey
    if (!apiKey) {
      throw new Error("API key required. Configure luckyApiKey in MCP settings with your Lucky API key.")
    }

    const apiUrl = getApiUrl()
    const { invocation_id } = args as { invocation_id: string }

    const response = await fetchWithTimeout(`${apiUrl}/api/workflow/cancel/${invocation_id}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Invalid API key. Please check your MCP configuration.")
      }
      if (response.status === 404) {
        throw new Error(`Workflow execution not found: ${invocation_id}`)
      }
      throw new Error(`Failed to cancel workflow: ${response.statusText}`)
    }

    let result: unknown
    try {
      result = await response.json()
    } catch {
      throw new Error(`Backend returned invalid JSON response (status ${response.status})`)
    }

    return asText(result)
  },
})

const PORT = Number(process.env.PORT || 3000)
const HOST = process.env.CLOUD_SERVICE === "true" ? "0.0.0.0" : process.env.HOST || "localhost"
type StartArgs = Parameters<typeof server.start>[0]
let args: StartArgs

if (
  process.env.CLOUD_SERVICE === "true" ||
  process.env.SSE_LOCAL === "true" ||
  process.env.HTTP_STREAMABLE_SERVER === "true"
) {
  args = {
    transportType: "httpStream",
    httpStream: {
      port: PORT,
      host: HOST,
      stateless: true,
    },
  }
} else {
  // default: stdio
  args = {
    transportType: "stdio",
  }
}

await server.start(args)
