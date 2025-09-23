/**
 * Lightweight Claude Code SDK service for pluggable integration.
 * Provides a clean interface without coupling to the main pipeline.
 */

import { claude } from "@instantlyeasy/claude-code-sdk-ts"
import type { ProcessedResponse } from "@core/messages/api/vercel/processResponse.types"
import type { AgentStep } from "@core/messages/pipeline/AgentStep.types"
import { lgg } from "@core/utils/logging/Logger"
import { type ClaudeSDKConfig, SDK_VERSION } from "./types"

export interface SDKRequest {
  prompt: string
  nodeId: string
  invocationId?: string
  config?: ClaudeSDKConfig
}

/**
 * Minimal service class for Claude SDK execution.
 * Designed to be pluggable with minimal coupling.
 */
export class ClaudeSDKService {
  private static versionChecked = false

  /**
   * Initialize SDK service and log version info (once per runtime).
   * Does not fail on version issues as SDK may not expose version.
   */
  private static initializeSDK(): void {
    if (this.versionChecked) return
    this.versionChecked = true

    try {
      // Try to import SDK package.json for actual version check
      const sdkPackage = require("@instantlyeasy/claude-code-sdk-ts/package.json")
      const sdkVersion = sdkPackage?.version || "unknown"
      
      lgg.info("[ClaudeSDK] Service initialized", {
        sdkVersion,
        integrationVersion: SDK_VERSION.integrationVersion,
        expectedRange: `${SDK_VERSION.minVersion} - ${SDK_VERSION.maxVersion}`,
      })
      
      // Log warning if version is outside expected range (but don't fail)
      if (sdkVersion !== "unknown") {
        const versionParts = sdkVersion.split(".")
        const minParts = SDK_VERSION.minVersion.split(".")
        const maxParts = SDK_VERSION.maxVersion.split(".")
        
        const isValidVersion = 
          versionParts[0] >= minParts[0] && 
          versionParts[0] <= maxParts[0]
        
        if (!isValidVersion) {
          lgg.warn("[ClaudeSDK] SDK version outside expected range", {
            installed: sdkVersion,
            expected: `${SDK_VERSION.minVersion} - ${SDK_VERSION.maxVersion}`,
          })
        }
      }
    } catch (err) {
      // SDK package.json not accessible, just log basic info
      lgg.info("[ClaudeSDK] Service initialized (version check skipped)", {
        integrationVersion: SDK_VERSION.integrationVersion,
        reason: "SDK package.json not accessible",
      })
    }
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
    // Initialize SDK service on first use
    this.initializeSDK()

    const request: SDKRequest = {
      nodeId,
      prompt,
      config,
      invocationId,
    }
    return new ClaudeSDKService().executeInternal(request)
  }

  /**
   * Internal execution method using Claude SDK with retry logic.
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
          lgg.info(`[ClaudeSDK] Retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`, {
            nodeId: request.nodeId,
          })
          await new Promise(resolve => setTimeout(resolve, delay))
        }
        
        // Track execution start time for performance metrics
        const startTime = Date.now()
        
        // Build query
        let query = claude()

        if (request.config?.model) {
          query = query.withModel(request.config.model)
        }

        if (request.config?.allowedTools?.length) {
          // SDK expects specific tool names, cast them properly
          const tools = request.config.allowedTools as Parameters<
            typeof query.allowTools
          >
          query = query.allowTools(...tools)
        }

        if (request.config?.skipPermissions) {
          query = query.skipPermissions()
        }

        if (request.config?.timeout) {
          query = query.withTimeout(request.config.timeout)
        }

        // Execute with timeout protection
        const timeoutMs = request.config?.timeout || 60000
        const parser = query.query(request.prompt)
        
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`SDK execution timed out after ${timeoutMs}ms`)), timeoutMs)
        })
        
        // Race between execution and timeout
        const response = await Promise.race([
          parser.asText(),
          timeoutPromise
        ])

        // Get usage (non-blocking)
        let cost = 0
        let tokens = 0
        try {
          const usage = await parser.getUsage()
          if (usage) {
            cost = usage.totalCost ?? 0
            tokens = usage.totalTokens ?? 0
          }
        } catch (e) {
          // Usage is optional, don't fail if unavailable
          lgg.debug("[ClaudeSDK] Could not retrieve usage metrics", { error: e })
        }

        // Calculate execution time
        const executionTime = Date.now() - startTime

        // Build response
        const agentSteps: AgentStep[] = [{ type: "text", return: response }]

        const summaryText = `SDK: ${request.config?.model ?? "sonnet"}, tokens: ${tokens}, cost: $${cost.toFixed(4)}, time: ${executionTime}ms`

        const processed: ProcessedResponse = {
          nodeId: request.nodeId,
          type: "text",
          content: response,
          cost,
          agentSteps,
          summary: summaryText,
        }

        // Log successful execution
        lgg.info("[ClaudeSDK] Execution successful", {
          nodeId: request.nodeId,
          model: request.config?.model ?? "sonnet",
          tokens,
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
    ]
    
    // Non-retryable error patterns
    const nonRetryablePatterns = [
      "authentication",
      "unauthorized",
      "403",
      "invalid api key",
      "permission",
      "not found",
      "404",
    ]
    
    // Check for non-retryable patterns first
    if (nonRetryablePatterns.some(pattern => message.includes(pattern))) {
      return false
    }
    
    // Check for retryable patterns
    return retryablePatterns.some(pattern => message.includes(pattern))
  }
}
