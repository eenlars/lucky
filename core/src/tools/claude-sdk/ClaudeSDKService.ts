/**
 * Official Anthropic SDK service for pluggable integration.
 * Provides a clean interface without coupling to the main pipeline.
 */

import Anthropic from "@anthropic-ai/sdk"
import type { Message } from "@anthropic-ai/sdk/resources"
import type { ProcessedResponse } from "@core/messages/api/vercel/processResponse.types"
import type { AgentStep } from "@core/messages/pipeline/AgentStep.types"
import { lgg } from "@core/utils/logging/Logger"
import { type ClaudeSDKConfig, SDK_VERSION, MODEL_PRICING } from "./types"

export interface SDKRequest {
  prompt: string
  nodeId: string
  invocationId?: string
  config?: ClaudeSDKConfig
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
    const maxRetries = 2
    const retryDelay = 1000 // 1 second base delay
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Add delay before retry (exponential backoff)
        if (attempt > 0) {
          const delay = retryDelay * Math.pow(2, attempt - 1)
          lgg.info(
            `[ClaudeSDK] Retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`,
            {
              nodeId: request.nodeId,
            }
          )
          await new Promise((resolve) => setTimeout(resolve, delay))
        }

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

        // Create message with timeout protection
        const timeoutMs = request.config?.timeout || 60000

        const messagePromise = client.messages.create({
          model: modelId,
          messages,
          max_tokens: maxTokens,
          // Add any additional parameters from config
          ...(request.config?.temperature && { temperature: request.config.temperature }),
          ...(request.config?.topP && { top_p: request.config.topP }),
        })

        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error(`SDK execution timed out after ${timeoutMs}ms`)),
            timeoutMs
          )
        })

        // Race between execution and timeout
        const message = await Promise.race([messagePromise, timeoutPromise]) as Message

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
          model: modelId,
          inputTokens: usage?.input_tokens || 0,
          outputTokens: usage?.output_tokens || 0,
          cost,
          executionTime,
          attempt: attempt + 1,
        })

        return { response: processed, cost, agentSteps }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Check if error is retryable
        const isRetryable = this.isRetryableError(lastError)

        if (!isRetryable || attempt === maxRetries) {
          // Final failure - return error response
          const errorMsg = lastError.message

          lgg.error("[ClaudeSDK] Execution failed", {
            error: errorMsg,
            nodeId: request.nodeId,
            attempt: attempt + 1,
            maxRetries: maxRetries + 1,
            retryable: isRetryable,
          })

          const agentSteps: AgentStep[] = [
            { type: "error", return: `SDK Error: ${errorMsg}` },
          ]

          const processed: ProcessedResponse = {
            nodeId: request.nodeId,
            type: "error",
            message: errorMsg,
            cost: 0,
            agentSteps,
            details: {
              attempts: attempt + 1,
              lastError: errorMsg,
            },
          }

          return { response: processed, cost: 0, agentSteps }
        }

        // Log retry attempt
        lgg.warn("[ClaudeSDK] Execution failed, will retry", {
          error: lastError.message,
          nodeId: request.nodeId,
          attempt: attempt + 1,
          nextAttemptIn: `${retryDelay * Math.pow(2, attempt)}ms`,
        })
      }
    }

    // This should never be reached, but TypeScript requires it
    throw lastError || new Error("Unexpected SDK execution failure")
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
   * Extracts text content from an Anthropic message response.
   */
  private extractTextFromMessage(message: Message): string {
    const textBlocks = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block.type === "text" ? block.text : ""))
    
    return textBlocks.join("\n")
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

  /**
   * Determines if an error is retryable.
   * Network errors, rate limits, and timeouts are retryable.
   * Authentication and configuration errors are not.
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase()

    // Retryable error patterns
    const retryablePatterns = [
      "timeout",
      "network",
      "econnreset",
      "econnrefused",
      "socket hang up",
      "rate limit",
      "429",
      "503",
      "502",
      "504",
      "overloaded",
    ]

    // Non-retryable error patterns
    const nonRetryablePatterns = [
      "authentication",
      "unauthorized",
      "403",
      "invalid api key",
      "invalid_api_key",
      "permission",
      "not found",
      "404",
      "invalid_request",
    ]

    // Check for non-retryable patterns first
    if (nonRetryablePatterns.some((pattern) => message.includes(pattern))) {
      return false
    }

    // Check for retryable patterns
    return retryablePatterns.some((pattern) => message.includes(pattern))
  }
}