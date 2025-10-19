/**
 * Lucky Client - Workflow API interface
 *
 * This is a minimal client for the Lucky workflow API.
 * Workflows are DAGs optimized via genetic programming to find the best agent collaboration patterns.
 *
 * For production use, workflows are managed through the MCP server (index.ts).
 * This file provides type definitions for reference and potential SDK usage.
 */

export interface LuckyConfig {
  apiKey?: string
  apiUrl?: string
}

export interface Workflow {
  workflow_id: string
  name: string
  description: string
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
  created_at: string
}

export interface WorkflowInvocationResult {
  invocation_id: string
  state: "running" | "completed" | "failed" | "cancelled" | "cancelling" | "not_found"
  createdAt: string
  output?: unknown
  error?: string
}

export interface InvokeOptions {
  timeoutMs?: number
  trace?: boolean
}

/**
 * LuckyClient - Interface for Lucky workflow API
 *
 * Provides type-safe access to workflow operations.
 * Actual implementation is in the MCP server (index.ts).
 */
export class LuckyClient {
  private apiKey?: string
  private apiUrl: string

  constructor(config?: LuckyConfig) {
    this.apiKey = config?.apiKey
    this.apiUrl = config?.apiUrl || process.env.LUCKY_API_URL || "http://localhost:3000"
  }

  /**
   * List all workflows available to the user
   */
  async listWorkflows(): Promise<Workflow[]> {
    return this.request("/api/user/workflows", {})
  }

  /**
   * Invoke a workflow with input data
   */
  async invokeWorkflow(workflowId: string, input: unknown, options?: InvokeOptions): Promise<WorkflowInvocationResult> {
    return this.request("/api/v1/invoke", {
      jsonrpc: "2.0",
      method: "workflow.invoke",
      params: {
        workflow_id: workflowId,
        input,
        options: options || {},
      },
    })
  }

  /**
   * Check the status of a workflow invocation
   */
  async checkStatus(invocationId: string): Promise<WorkflowInvocationResult> {
    return this.request(`/api/workflow/status/${invocationId}`, {})
  }

  /**
   * Cancel a running workflow invocation
   */
  async cancelWorkflow(invocationId: string): Promise<{ success: boolean }> {
    return this.request(`/api/workflow/cancel/${invocationId}`, {}, "POST")
  }

  /**
   * Internal request handler
   */
  private async request(endpoint: string, body: unknown, method: "POST" = "POST"): Promise<any> {
    const url = `${this.apiUrl}${endpoint}`
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`
    }

    try {
      const bodyStr =
        body && typeof body === "object" && Object.keys(body as object).length > 0 ? JSON.stringify(body) : undefined

      const response = await fetch(url, {
        method,
        headers,
        body: bodyStr,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      return await response.json()
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error))
    }
  }
}

export default LuckyClient
