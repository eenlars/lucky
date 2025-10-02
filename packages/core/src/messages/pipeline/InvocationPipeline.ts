import { lgg } from "@core/utils/logging/Logger"
import { SpendingTracker } from "@core/utils/spending/SpendingTracker"

// @sdk-import - marker for easy removal when ejecting SDK
import { CONFIG, PATHS, isLoggingEnabled } from "@core/core-config/compat"
import { extractTextFromPayload } from "@core/messages/MessagePayload"
import { processResponseVercel } from "@core/messages/api/processResponse"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import {
  type ProcessedResponse,
  isErrorProcessed,
  isTextProcessed,
  isToolProcessed,
} from "@core/messages/api/vercel/processResponse.types"
import type { AgentStep, AgentSteps } from "@core/messages/pipeline/AgentStep.types"
import { runMultiStepLoopV2Helper } from "@core/messages/pipeline/agentStepLoop/MultiStepLoopV2"
import { runMultiStepLoopV3Helper } from "@core/messages/pipeline/agentStepLoop/MultiStepLoopV3"
import { prepareIncomingMessage } from "@core/messages/pipeline/prepare/incomingMessage"
import { createSummary } from "@core/messages/summaries"
import type { NodeInvocationResult } from "@core/node/WorkFlowNode"
import { extractToolLogs } from "@core/node/extractToolLogs"
import { handleError, handleSuccess } from "@core/node/responseHandler"
import type { ToolManager } from "@core/node/toolManager"
import { makeLearning } from "@core/prompts/makeLearning"
import { ClaudeSDKService } from "@core/tools/claude-sdk/ClaudeSDKService"
import { saveInLoc, saveInLogging } from "@core/utils/fs/fileSaver"
import { JSONN } from "@core/utils/json"
import { isNir } from "@lucky/shared"
import type { GenerateTextResult, ModelMessage, ToolChoice, ToolSet } from "ai"
import type { NodeInvocationCallContext } from "./input.types"

const maxRounds = CONFIG.tools.experimentalMultiStepLoopMaxRounds

const verbose = isLoggingEnabled("InvocationPipeline")

/* -------------------------------------------------------------------------- */
/*                         🚀  INVOCATION  PIPELINE                           */
/* -------------------------------------------------------------------------- */

/**
 * Core agent invocation pipeline that orchestrates message processing.
 *
 * ## Architecture Overview
 *
 * The pipeline implements a three-phase execution model:
 * 1. **Prepare**: Tool initialization, message preparation, strategy selection
 * 2. **Execute**: Single-call or multi-step loop execution with AI
 * 3. **Process**: Response handling, memory extraction, result formatting
 *
 * ## Execution Strategies
 *
 * - **Single Call**: Direct AI invocation with optional tool use
 * - **Multi-Step Loop V2**: Iterative tool execution with context accumulation
 * - **Multi-Step Loop V3**: Advanced strategy with parallel tool execution
 *
 * ## Runtime State Management
 *
 * The pipeline maintains critical state throughout execution:
 * - `sdkMessages`: Conversation history for AI context
 * - `tools`: Available tools mapped by name
 * - `agentSteps`: Detailed execution transcript
 * - `usdCost`: Accumulated cost tracking
 * - `updatedMemory`: Extracted learnings for persistence
 *
 * ## Error Recovery
 *
 * Errors during execution are captured and transformed into error responses
 * rather than throwing, ensuring workflow continuity. Critical context is
 * logged for debugging including node ID, workflow version, and available tools.
 */
export class InvocationPipeline {
  /* ------------------------------- state --------------------------------- */
  private sdkMessages: ModelMessage[] = []
  private tools: ToolSet = {}
  private toolChoice: ToolChoice<ToolSet> | null = null

  private processedResponse: ProcessedResponse | null = null
  private usdCost = 0
  private updatedMemory: Record<string, string> | null = null
  private agentSteps: AgentStep<any>[] = []
  private debugPrompts: string[] = []

  constructor(
    private readonly ctx: NodeInvocationCallContext,
    private readonly toolManager: ToolManager,
    private readonly saveOutputs?: boolean,
  ) {}

  /* ---------------------------------------------------------------------- */
  /*                              🛠  PREPARE                               */
  /* ---------------------------------------------------------------------- */

  /**
   * Prepares the pipeline for execution by initializing tools and messages.
   *
   * Runtime operations:
   * 1. Initializes all tools through ToolManager (MCP and code tools)
   * 2. Prepares incoming message with context and memory
   * 3. Determines tool selection strategy based on configuration
   *
   * Strategy selection:
   * - Multi-step loop: Defers tool choice to execution phase
   * - Single tool: Forces that tool's usage
   * - Multiple tools: Uses "auto" for AI-driven selection
   *
   * @returns this instance for method chaining
   */
  public async prepare(): Promise<this> {
    await this.toolManager.initializeTools()
    this.tools = await this.toolManager.getAllTools(this.ctx)
    if (isNir(this.tools)) {
      this.toolChoice = "auto"
      return this
    }

    await prepareIncomingMessage(this.ctx, this.tools, this.ctx.nodeMemory, this.agentSteps)

    // no need to prepare. this is handled in the multi-step loop.
    if (CONFIG.tools.experimentalMultiStepLoop) return this

    const hasOneTool = Object.keys(this.tools).length === 1

    if (!hasOneTool && CONFIG.tools.usePrepareStepStrategy) {
      this.toolChoice = "auto"
    }

    return this
  }

  /* ---------------------------------------------------------------------- */
  /*                              🏃  EXECUTE                               */
  /* ---------------------------------------------------------------------- */

  /**
   * Executes the main invocation logic using the configured strategy.
   *
   * ## Runtime Flow
   *
   * ### Claude SDK Path (when useClaudeSDK is true):
   * 1. Executes using Claude Code SDK wrapper
   * 2. Maps SDK response to existing format
   * 3. Tracks costs and agent steps
   *
   * ### Multi-Step Loop Path (when tools available):
   * 1. Selects V2 or V3 strategy based on override
   * 2. Runs iterative tool execution with AI guidance
   * 3. Synchronizes agent steps and cost from result
   *
   * ### Single Call Path (no tools or disabled):
   * 1. Makes single AI call with optional tool use
   * 2. Processes response and extracts agent steps
   * 3. Finalizes summary with additional metadata
   *
   * ## Error Handling
   *
   * Catches all errors and transforms them into error responses.
   * Logs critical context for debugging:
   * - Node ID and workflow version
   * - Model name and available tools
   * - Full error stack trace
   *
   * @returns this instance for method chaining
   * @throws Never - errors are caught and transformed into responses
   */
  public async execute(): Promise<this> {
    try {
      // Check if this node should use Claude SDK
      if (this.ctx.nodeConfig.useClaudeSDK) {
        await this.runWithSDK()
      } else if (CONFIG.tools.experimentalMultiStepLoop && Object.keys(this.tools)?.length > 0) {
        if (this.ctx.toolStrategyOverride === "v3") {
          await this.runMultiStepLoopV3()
        } else {
          await this.runMultiStepLoopV2()
        }

        // sync the agentSteps and cost from multi-step loop result
        if (this.processedResponse?.agentSteps) {
          // sync both the agentSteps outputs and cost from the multi-step loop
          this.agentSteps = this.processedResponse.agentSteps
          this.usdCost = this.processedResponse.cost || this.usdCost
        } else {
          lgg.error("[InvocationPipeline_runMultiStepLoop]:", this.processedResponse)
        }
      } else {
        this.processedResponse = await this.runSingleCall()

        // add node logs for single call path BEFORE finalizeSummary
        if (this.processedResponse?.agentSteps) {
          this.agentSteps.push(...this.processedResponse.agentSteps)
        }

        // validate processedResponse before proceeding
        if (!this.processedResponse) {
          throw new Error("runSingleCall() returned null/undefined processedResponse")
        }

        if (!this.processedResponse.type) {
          lgg.error("[InvocationPipeline] processedResponse missing type property:", this.processedResponse)
          throw new Error("processedResponse missing required 'type' property")
        }

        this.processedResponse = await this.finalizeSummary(this.processedResponse)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const stack = err instanceof Error ? err.stack : undefined

      lgg.error(`[InvocationPipeline] Execution error: ${msg}`)
      lgg.error(`[InvocationPipeline] Node context: ${this.ctx.nodeConfig.nodeId}`)
      lgg.error(`[InvocationPipeline] Workflow: ${this.ctx.workflowVersionId}`)
      lgg.error(`[InvocationPipeline] Model: ${this.ctx.nodeConfig.modelName}`)
      lgg.error(`[InvocationPipeline] Tools available: ${Object.keys(this.tools).join(", ")}`)

      if (stack) {
        lgg.error("[InvocationPipeline] Stack trace:", stack)
      }

      if (err instanceof Error && err.cause) {
        lgg.error("[InvocationPipeline] Error cause:", err.cause)
      }

      // Reset state to prevent inconsistencies
      this.processedResponse = null

      throw new Error(`Execution error: ${msg}`)
    }

    return this
  }

  /* ---------------------------------------------------------------------- */
  /*                            📦  PROCESS                                 */
  /* ---------------------------------------------------------------------- */

  public async process(): Promise<NodeInvocationResult> {
    // todo-racecondition: potential race condition if execute() hasn't completed when process() is called
    if (!this.processedResponse) {
      const message =
        "[InvocationPipeline] Processing error: empty processedResponse - ensure execute() completed before calling process()"
      lgg.warn(message)
      return handleError({
        context: this.ctx,
        errorMessage: message,
        summary: message,
        agentSteps: undefined,
        debugPrompts: this.debugPrompts,
      })
    }

    const response = this.processedResponse

    if (isErrorProcessed(response)) {
      return handleError({
        context: this.ctx,
        errorMessage: response.message,
        summary: response.summary ?? "there was an error",
        agentSteps: response.agentSteps,
        debugPrompts: this.debugPrompts,
      })
    }

    const result = handleSuccess(
      this.ctx,
      response,
      this.debugPrompts,
      this.usdCost,
      this.updatedMemory,
      this.agentSteps,
    )

    return result
  }

  /* ---------------------------------------------------------------------- */
  /*                         🛤️   PRIVATE FLOW                              */
  /* ---------------------------------------------------------------------- */

  /**
   * Executes the node using Claude Code SDK.
   * Maps SDK response to existing ProcessedResponse format.
   */
  private async runWithSDK(): Promise<void> {
    lgg.info("[InvocationPipeline] Using Claude Code SDK", {
      nodeId: this.ctx.nodeConfig.nodeId,
      sdkConfig: this.ctx.nodeConfig.sdkConfig,
    })

    // Extract the prompt from incoming message
    const incomingText = extractTextFromPayload(this.ctx.workflowMessageIncoming.payload)

    // Combine system prompt and user message for SDK
    const fullPrompt = `${this.ctx.nodeConfig.systemPrompt}\n\n${incomingText}`

    // Use ClaudeSDKService for execution
    const result = await ClaudeSDKService.execute(
      this.ctx.nodeConfig.nodeId,
      fullPrompt,
      this.ctx.nodeConfig.sdkConfig,
      this.ctx.workflowInvocationId,
    )

    // Set the processed response and agent steps
    this.processedResponse = result.response
    this.agentSteps = result.agentSteps
    // Don't set usdCost directly - addCost will handle it

    // Track SDK costs in spending tracker and update usdCost
    if (result.cost > 0) {
      this.addCost(result.cost, true) // Mark as SDK cost
    }

    if (this.processedResponse.type === "text") {
      lgg.info("[InvocationPipeline] SDK execution successful", {
        nodeId: this.ctx.nodeConfig.nodeId,
        responseLength: this.processedResponse.content.length,
        cost: this.usdCost,
      })
    } else if (this.processedResponse.type === "error") {
      lgg.error("[InvocationPipeline] SDK execution failed", {
        nodeId: this.ctx.nodeConfig.nodeId,
        error: this.processedResponse.message,
      })
    }
  }

  private async runSingleCall(): Promise<ProcessedResponse> {
    // Log tool calling attempt
    if (verbose) {
      lgg.log(`[InvocationPipeline] Starting tool call with choice: ${JSON.stringify(this.toolChoice)}`)
      lgg.log(`[InvocationPipeline] Available tools: ${Object.keys(this.tools).join(", ")}`)
    }

    // Build messages from incoming payload's berichten instead of sdkMessages
    const incomingText = extractTextFromPayload(this.ctx.workflowMessageIncoming.payload)
    const messages = [
      {
        role: "system" as const,
        content: this.ctx.nodeConfig.systemPrompt,
      },
      {
        role: "user" as const,
        content: incomingText,
      },
    ]

    const res = await sendAI({
      model: this.ctx.nodeConfig.modelName,
      messages,
      mode: "tool",
      opts: {
        tools: this.tools,
        toolChoice: this.toolChoice ?? "auto",
        saveOutputs: this.saveOutputs,
        maxSteps: this.toolChoice === "required" ? 1 : undefined,
      },
    })

    // Log tool call results
    if (verbose) {
      lgg.log(`[InvocationPipeline] Tool call result success: ${res.success}`)
      if (!res.success) {
        lgg.error(`[InvocationPipeline] Tool call failed: ${res.error}`)
      }
    }

    this.addCost(res.usdCost ?? 0)

    // Graceful handling: if sendAI failed, create a proper error ProcessedResponse
    const processed: ProcessedResponse = res.success
      ? processResponseVercel({
          response: res.data as GenerateTextResult<ToolSet, any>,
          modelUsed: this.ctx.nodeConfig.modelName,
          nodeId: this.ctx.nodeConfig.nodeId,
        })
      : {
          nodeId: this.ctx.nodeConfig.nodeId,
          type: "error",
          message: res.error ?? "Tool call failed",
          details: res.debug_output,
          cost: res.usdCost ?? 0,
          agentSteps: [{ type: "error", return: res.error ?? "Tool call failed" }],
        }

    if (verbose) {
      const ts = Date.now()
      saveInLoc(
        `${PATHS.node.logging}/debug/response_after_processing_${ts}_${this.ctx.nodeConfig.nodeId}`,
        JSONN.show(processed),
      )
    }

    // ensure summary exists
    let finalProcessed = processed
    if (!processed.summary && !isToolProcessed(processed)) {
      finalProcessed = {
        ...processed,
        nodeId: this.ctx.nodeConfig.nodeId,
        summary: isTextProcessed(processed) ? processed.content : isErrorProcessed(processed) ? processed.message : "",
      }
    }

    return finalProcessed
  }

  /* ---------------------------------------------------------------------- */

  private async runMultiStepLoopV2(): Promise<ProcessedResponse> {
    const processedResponse = await runMultiStepLoopV2Helper({
      ctx: this.ctx,
      tools: this.tools,
      agentSteps: this.agentSteps,
      model: this.ctx.nodeConfig.modelName,
      maxRounds,
      verbose,
      addCost: cost => this.addCost(cost),
      setUpdatedMemory: memory => {
        this.updatedMemory = memory
      },
      getTotalCost: () => this.usdCost,
    })
    this.processedResponse = processedResponse
    return processedResponse
  }

  private async runMultiStepLoopV3(): Promise<ProcessedResponse> {
    const { processedResponse, debugPrompts } = await runMultiStepLoopV3Helper({
      ctx: this.ctx,
      tools: this.tools,
      agentSteps: this.agentSteps,
      model: this.ctx.nodeConfig.modelName,
      maxRounds,
      verbose,
      addCost: cost => this.addCost(cost),
      setUpdatedMemory: memory => {
        this.updatedMemory = memory
      },
      getTotalCost: () => this.usdCost,
    })
    this.processedResponse = processedResponse
    this.debugPrompts = debugPrompts
    return processedResponse
  }

  private async finalizeSummary(processed: ProcessedResponse): Promise<ProcessedResponse> {
    // Generate summary if not already present
    const { summary, usdCost } = await createSummary(processed)
    this.addCost(usdCost)

    // Extract memory using makeLearning (same as runMultiStepLoop)
    const toolLogs = extractToolLogs(processed)
    const learnings = await makeLearning({
      toolLogs,
      nodeSystemPrompt: this.ctx.nodeConfig.systemPrompt,
      currentMemory: this.ctx.nodeMemory ?? {},
      mainWorkflowGoal: this.ctx.mainWorkflowGoal,
    })

    // Store memory updates
    if (learnings && !CONFIG.tools.experimentalMultiStepLoop) {
      // the experimentalMultiStepLoop already updates the memory
      this.updatedMemory = learnings.updatedMemory
    }

    // Use existing summary if available, otherwise use the generated one
    const finalSummary = processed.summary || summary || ""

    saveInLogging(finalSummary, "finalSummary", ".md")

    // Format learnings for response
    const learningsString = learnings
      ? Object.entries(learnings)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n")
      : ""

    return {
      ...processed,
      nodeId: this.ctx.nodeConfig.nodeId,
      summary: finalSummary,
      learnings: learningsString,
      cost: this.usdCost,
      agentSteps: this.agentSteps,
    }
  }

  /**
   * Adds cost to internal tracking and SpendingTracker.
   * @param c Cost in USD
   * @param isSDK Whether this cost is from SDK execution
   */
  private addCost(c = 0, isSDK = false): void {
    this.usdCost += c
    const tracker = SpendingTracker.getInstance()
    if (isSDK) {
      tracker.addSDKCost(c, this.ctx.workflowInvocationId)
    } else {
      tracker.addCost(c)
    }
  }

  public getAgentSteps(): AgentSteps {
    return this.agentSteps
  }

  public getUpdatedMemory(): Record<string, string> | null {
    return this.updatedMemory
  }
}
