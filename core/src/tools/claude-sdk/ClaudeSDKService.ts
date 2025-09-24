/**
 * Official Anthropic SDK service for pluggable integration.
 * Provides a clean interface without coupling to the main pipeline.
 */

import Anthropic from "@anthropic-ai/sdk"
import type { Message, Tool } from "@anthropic-ai/sdk/resources"
import type { ProcessedResponse } from "@core/messages/api/vercel/processResponse.types"
import type { AgentStep } from "@core/messages/pipeline/AgentStep.types"
import { lgg } from "@core/utils/logging/Logger"
import { type ClaudeSDKConfig, SDK_VERSION, MODEL_PRICING } from "./types"

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
 */
export class ClaudeSDKService {
  private static client: Anthropic | null = null
  private static initialized = false

  /**
   * Initialize SDK client (singleton pattern for efficiency).
   * Uses environment variable ANTHROPIC_API_KEY.
   */
  private static initializeClient(): Anthropic {
    // Always check for API key, even if client exists
    const apiKey = process.env.ANTHROPIC_API_KEY
    
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY environment variable is required for SDK usage"
      )
    }

    if (!this.client) {
      this.client = new Anthropic({
        apiKey,
        maxRetries: 2, // SDK's built-in retry mechanism
        // Optional: Add custom headers or other config
      })

      if (!this.initialized) {
        this.initialized = true
        lgg.info("[ClaudeSDK] Anthropic SDK client initialized", {
          integrationVersion: SDK_VERSION.integrationVersion,
        })
      }
    }

    return this.client
  }

  /**
   * Static method for direct execution without instance management.
   * Keeps the service lightweight and stateless.
   */
  static async execute(
    nodeId: string,
    prompt: string,
    config?: SDKRequest["config"],
    invocationId?: string
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
        const client = ClaudeSDKService.initializeClient()

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
          ...(request.config?.temperature && { temperature: request.config.temperature }),
          ...(request.config?.topP && { top_p: request.config.topP }),
          ...(request.config?.systemPrompt && { 
            system: request.config.systemPrompt 
          }),
          ...(request.tools && request.tools.length > 0 && { tools: request.tools }),
        }

        // Create request with optional timeout
        const message = await client.messages.create(
          messageOptions,
          timeoutMs ? { timeout: timeoutMs } : {}
        )

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

        if (error instanceof Anthropic.APIError) {
          errorMessage = error.message
          statusCode = error.status
          requestId = (error as any).headers?.['request-id'] || requestId
          
          // Map specific error types
          if (error instanceof Anthropic.BadRequestError) {
            errorType = "BadRequestError"
          } else if (error instanceof Anthropic.AuthenticationError) {
            errorType = "AuthenticationError"
          } else if (error instanceof Anthropic.PermissionDeniedError) {
            errorType = "PermissionDeniedError"
          } else if (error instanceof Anthropic.NotFoundError) {
            errorType = "NotFoundError"
          } else if (error instanceof Anthropic.UnprocessableEntityError) {
            errorType = "UnprocessableEntityError"
          } else if (error instanceof Anthropic.RateLimitError) {
            errorType = "RateLimitError"
            isRetryable = true
          } else if (error instanceof Anthropic.InternalServerError) {
            errorType = "InternalServerError"
            isRetryable = true
          } else if (error instanceof Anthropic.APIConnectionError) {
            errorType = "APIConnectionError"
            isRetryable = true
          }
        } else if (error instanceof Error) {
          errorMessage = error.message
          // Check for timeout errors
          if (error.message.includes('timeout')) {
            errorType = "TimeoutError"
            isRetryable = true
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

        const agentSteps: AgentStep[] = [
          { type: "error", return: `SDK ${errorType}: ${errorMessage}` },
        ]

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
   */
  private getModelId(model?: ClaudeSDKConfig["model"]): string {
    const modelMap = {
      "opus-3": "claude-3-opus-20240229",
      "sonnet-3.5": "claude-3-5-sonnet-20241022",
      "sonnet-3": "claude-3-sonnet-20240229",
      "haiku-3": "claude-3-haiku-20240307",
      // Latest versions (default)
      "opus": "claude-3-opus-latest",
      "sonnet": "claude-3-5-sonnet-latest",
      "haiku": "claude-3-haiku-latest",
    }

    return modelMap[model || "sonnet"] || "claude-3-5-sonnet-latest"
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
  private calculateCost(
    modelId: string,
    usage?: { input_tokens: number; output_tokens: number }
  ): number {
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