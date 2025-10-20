/**
 * Official Anthropic SDK service for pluggable integration.
 * Provides a clean interface without coupling to the main pipeline.
 */

import Anthropic from "@anthropic-ai/sdk"
import type { Message, Tool } from "@anthropic-ai/sdk/resources"
import { getApiKey } from "@core/context/executionContext"
import type { ProcessedResponse } from "@core/messages/api/vercel/processResponse.types"
import type { AgentStep } from "@core/messages/pipeline/AgentStep.types"
import { MissingConfigError } from "@core/utils/errors/data-errors"
import { lgg } from "@core/utils/logging/Logger"
import { type ClaudeSDKConfig, MODEL_PRICING, SDK_VERSION } from "./types"

/**
 * Simple hash function for API keys to avoid logging sensitive credentials.
 * Returns first 4 and last 4 characters with a hash count in the middle.
 */
function hashApiKey(apiKey: string): string {
  const prefix = apiKey.slice(0, 4)
  const suffix = apiKey.slice(-4)
  const hash = apiKey.length.toString(16)
  return apiKey.length <= 8 ? "[redacted]" : `${prefix}...${hash}...${suffix}`
}

export interface SDKRequest {
  prompt: string
  nodeId: string
  invocationId?: string
  config?: ClaudeSDKConfig
  tools?: Tool[]
}

/**
 * Service class for official Anthropic SDK execution.
 * Designed to be pluggable with minimal coupling.
 *
 * SECURITY: Uses key-based client caching to ensure each execution context
 * with a different API key gets its own client instance. This prevents
 * credential leaking when multiple users make requests in the same process.
 */
export class ClaudeSDKService {
  // Map clients by API key to ensure key isolation
  // Each unique API key gets its own client instance
  private static clientCache: Map<string, Anthropic> = new Map()

  /**
   * List all available Claude models from the API.
   * Returns official model IDs, display names, and creation dates.
   */
  static async listModels(): Promise<
    Array<{
      id: string
      display_name: string
      created_at: string
      type: string
    }>
  > {
    const client = await ClaudeSDKService.initializeClient()

    try {
      const response = await client.models.list()
      return response.data
    } catch (error) {
      lgg.error("[ClaudeSDK] Failed to list models", { error })
      throw error
    }
  }

  /**
   * Initialize SDK client with key-based caching for BYOK isolation.
   *
   * Fetches the API key from the execution context and maintains a separate
   * client for each unique key. This ensures that different users' credentials
   * are never mixed up or shared.
   *
   * @throws MissingConfigError if ANTHROPIC_API_KEY is not available
   */
  private static async initializeClient(): Promise<Anthropic> {
    // Always fetch the API key from execution context (respects BYOK)
    const apiKey = await getApiKey("ANTHROPIC_API_KEY")

    if (!apiKey) {
      throw new MissingConfigError("ANTHROPIC_API_KEY", {
        requiredFor: "Anthropic Claude SDK usage",
        suggestion: "Configure ANTHROPIC_API_KEY in Settings → Providers or set it in your environment variables.",
      })
    }

    // Check if we already have a client for this specific API key
    let client = ClaudeSDKService.clientCache.get(apiKey)

    if (!client) {
      // Create a new client for this API key
      client = new Anthropic({
        apiKey,
        maxRetries: 2, // SDK's built-in retry mechanism
      })

      // Cache it by the API key
      ClaudeSDKService.clientCache.set(apiKey, client)

      lgg.info("[ClaudeSDK] New Anthropic SDK client created for API key", {
        integrationVersion: SDK_VERSION.integrationVersion,
        keyHash: hashApiKey(apiKey),
        cacheSize: ClaudeSDKService.clientCache.size,
      })
    }

    return client
  }

  /**
   * Static method for direct execution without instance management.
   * Keeps the service lightweight and stateless.
   */
  static async execute(
    nodeId: string,
    prompt: string,
    config?: SDKRequest["config"],
    invocationId?: string,
  ): Promise<{
    response: ProcessedResponse
    agentSteps: AgentStep[]
    cost: number
  }> {
    const request: SDKRequest = {
      nodeId,
      prompt,
      config,
      invocationId,
    }
    return new ClaudeSDKService().executeInternal(request)
  }

  /**
   * Internal execution method using official Anthropic SDK with retry logic.
   */
  private async executeInternal(request: SDKRequest): Promise<{
    response: ProcessedResponse
    agentSteps: AgentStep[]
    cost: number
  }> {
    let requestId: string | undefined

    try {
      // Track execution start time for performance metrics
      const startTime = Date.now()

      // Get client
      const client = await ClaudeSDKService.initializeClient()

      // Determine model from config (map our simple names to official model IDs)
      const modelId = this.getModelId(request.config?.model)

      // Prepare messages for the API
      const messages: Anthropic.MessageParam[] = [
        {
          role: "user",
          content: request.prompt,
        },
      ]

      // Determine max tokens (default to a reasonable value)
      const maxTokens = request.config?.maxTokens || 4096

      // Create message with optional timeout override
      const timeoutMs = request.config?.timeout

      const messageOptions: Anthropic.MessageCreateParams = {
        model: modelId,
        messages,
        max_tokens: maxTokens,
        // Add any additional parameters from config
        ...(request.config?.temperature && {
          temperature: request.config.temperature,
        }),
        ...(request.config?.topP && { top_p: request.config.topP }),
        ...(request.config?.systemPrompt && {
          system: request.config.systemPrompt,
        }),
        ...(request.tools && request.tools.length > 0 && { tools: request.tools }),
      }

      // Create request with optional timeout
      const message = await client.messages.create(messageOptions, timeoutMs ? { timeout: timeoutMs } : {})

      // Capture request ID for debugging
      requestId = (message as any)._request_id

      // Extract response text from content blocks
      const responseText = this.extractTextFromMessage(message)

      // Calculate execution time
      const executionTime = Date.now() - startTime

      // Calculate cost from usage
      const usage = message.usage
      const cost = this.calculateCost(modelId, usage)

      // Build response
      const agentSteps: AgentStep[] = [{ type: "text", return: responseText }]

      const summaryText = `SDK: ${modelId}, input: ${usage?.input_tokens || 0}, output: ${usage?.output_tokens || 0}, cost: $${cost.toFixed(4)}, time: ${executionTime}ms`

      const processed: ProcessedResponse = {
        nodeId: request.nodeId,
        type: "text",
        content: responseText,
        cost,
        agentSteps,
        summary: summaryText,
      }

      // Log successful execution
      lgg.info("[ClaudeSDK] Execution successful", {
        nodeId: request.nodeId,
        requestId,
        model: modelId,
        inputTokens: usage?.input_tokens || 0,
        outputTokens: usage?.output_tokens || 0,
        cost,
        executionTime,
      })

      return { response: processed, cost, agentSteps }
    } catch (error) {
      // Handle specific SDK error types
      let errorType = "APIError"
      let errorMessage = "Unknown error occurred"
      let statusCode: number | undefined
      let isRetryable = false

      if (error instanceof Error) {
        errorMessage = error.message

        // Check for specific error patterns
        const errorStr = error.message.toLowerCase()

        // Check for API key errors
        if (errorStr.includes("api") && errorStr.includes("key")) {
          errorType = "AuthenticationError"
          statusCode = 401
        }
        // Check for timeout errors
        else if (errorStr.includes("timeout")) {
          errorType = "TimeoutError"
          isRetryable = true
        }
        // Check for network/connection errors
        else if (errorStr.includes("network") || errorStr.includes("connection")) {
          errorType = "APIConnectionError"
          isRetryable = true
        }
        // Check for rate limit errors
        else if (errorStr.includes("rate") && errorStr.includes("limit")) {
          errorType = "RateLimitError"
          statusCode = 429
          isRetryable = true
        }

        // Try to get additional info from error object
        const anyError = error as any
        if (anyError.status) {
          statusCode = anyError.status
        }
        if (anyError.headers?.["request-id"]) {
          requestId = anyError.headers["request-id"]
        }
      } else {
        errorMessage = String(error)
      }

      // Log error with details
      lgg.error("[ClaudeSDK] Execution failed", {
        errorType,
        error: errorMessage,
        statusCode,
        nodeId: request.nodeId,
        requestId,
        retryable: isRetryable,
      })

      const agentSteps: AgentStep[] = [{ type: "error", return: `SDK ${errorType}: ${errorMessage}` }]

      const processed: ProcessedResponse = {
        nodeId: request.nodeId,
        type: "error",
        message: errorMessage,
        cost: 0,
        agentSteps,
        details: {
          errorType,
          statusCode,
          requestId,
          lastError: errorMessage,
        },
      }

      return { response: processed, cost: 0, agentSteps }
    }
  }

  /**
   * Maps our simplified model names to official Anthropic model IDs.
   * Use ClaudeSDKService.listModels() to fetch current available models programmatically.
   *
   * Model IDs retrieved from API on 2025-09-30:
   * - claude-sonnet-4-5-20250929 (Claude Sonnet 4.5)
   * - claude-opus-4-1-20250805 (Claude Opus 4.1)
   * - claude-opus-4-20250514 (Claude Opus 4)
   * - claude-sonnet-4-20250514 (Claude Sonnet 4)
   * - claude-3-7-sonnet-20250219 (Claude Sonnet 3.7)
   * - claude-3-5-sonnet-20241022 (Claude Sonnet 3.5 New)
   * - claude-3-5-haiku-20241022 (Claude Haiku 3.5)
   * - claude-3-5-sonnet-20240620 (Claude Sonnet 3.5 Old)
   * - claude-3-haiku-20240307 (Claude Haiku 3)
   * - claude-3-opus-20240229 (Claude Opus 3)
   */
  private getModelId(model?: ClaudeSDKConfig["model"]): string {
    const modelMap = {
      // Latest versions
      sonnet: "claude-sonnet-4-5-20250929",
      opus: "claude-opus-4-1-20250805",
      haiku: "claude-3-5-haiku-20241022",
      // Specific versions
      "sonnet-4.5": "claude-sonnet-4-5-20250929",
      "opus-4.1": "claude-opus-4-1-20250805",
      "opus-4": "claude-opus-4-20250514",
      "sonnet-4": "claude-sonnet-4-20250514",
      "sonnet-3.7": "claude-3-7-sonnet-20250219",
      "sonnet-3.5": "claude-3-5-sonnet-20241022",
      "haiku-3.5": "claude-3-5-haiku-20241022",
      "sonnet-3.5-old": "claude-3-5-sonnet-20240620",
      "haiku-3": "claude-3-haiku-20240307",
      "opus-3": "claude-3-opus-20240229",
    }

    return modelMap[model || "sonnet"] || "claude-sonnet-4-5-20250929"
  }

  /**
   * Extracts content from an Anthropic message response.
   * Handles both text and tool use content blocks.
   */
  private extractTextFromMessage(message: Message): string {
    const contentParts: string[] = []

    for (const block of message.content) {
      if (block.type === "text") {
        contentParts.push(block.text)
      } else if (block.type === "tool_use") {
        // Include tool call information in response
        contentParts.push(`[Tool Call: ${block.name}(${JSON.stringify(block.input)})]`)
      }
    }

    return contentParts.join("\n")
  }

  /**
   * Calculates approximate cost based on model and token usage.
   * Uses centralized pricing from types.ts.
   */
  private calculateCost(modelId: string, usage?: { input_tokens: number; output_tokens: number }): number {
    if (!usage) return 0

    // Find matching price tier from centralized pricing
    let priceInfo = { input: 3.0, output: 15.0 } // Default to Sonnet pricing
    for (const [key, value] of Object.entries(MODEL_PRICING)) {
      if (modelId.includes(key)) {
        priceInfo = value
        break
      }
    }

    const inputCost = (usage.input_tokens / 1_000_000) * priceInfo.input
    const outputCost = (usage.output_tokens / 1_000_000) * priceInfo.output

    return inputCost + outputCost
  }
}
