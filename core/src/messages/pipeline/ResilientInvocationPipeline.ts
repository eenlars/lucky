import { lgg } from "@core/utils/logging/Logger"
import { extractTextFromPayload } from "@core/messages/MessagePayload"
import { processResponseVercel } from "@core/messages/api/processResponse"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import {
  isErrorProcessed,
  isTextProcessed,
  isToolProcessed,
  type ProcessedResponse,
} from "@core/messages/api/vercel/processResponse.types"
import type {
  AgentStep,
  AgentSteps,
} from "@core/messages/pipeline/AgentStep.types"
import { runMultiStepLoopV2Helper } from "@core/messages/pipeline/agentStepLoop/MultiStepLoopV2"
import { runMultiStepLoopV3Helper } from "@core/messages/pipeline/agentStepLoop/MultiStepLoopV3"
import { prepareIncomingMessage } from "@core/messages/pipeline/prepare/incomingMessage"
import { createSummary } from "@core/messages/summaries"
import type { NodeInvocationResult } from "@core/node/WorkFlowNode"
import { extractToolLogs } from "@core/node/extractToolLogs"
import { handleError, handleSuccess } from "@core/node/responseHandler"
import type { ToolManager } from "@core/node/toolManager"
import { makeLearning } from "@core/prompts/makeLearning"
import { saveInLoc, saveInLogging } from "@runtime/code_tools/file-saver/save"
import { CONFIG, PATHS } from "@runtime/settings/constants"
import { JSONN } from "@shared/utils/files/json/jsonParse"
import type { CoreMessage, GenerateTextResult, ToolChoice, ToolSet } from "ai"
import type { NodeInvocationCallContext } from "./input.types"

// import resilience framework
import {
  ResilientExecutor,
  ResilientExecutorFactory,
  RetryPolicies,
  CircuitBreakerFactory,
  type ExecutionResult,
} from "@core/resilience"

const maxRounds = CONFIG.tools.experimentalMultiStepLoopMaxRounds
const verbose = CONFIG.logging.override.InvocationPipeline

export class ResilientInvocationPipeline {
  // state
  private sdkMessages: CoreMessage[] = []
  private tools: ToolSet = {}
  private toolChoice: ToolChoice<ToolSet> | null = null

  private processedResponse: ProcessedResponse | null = null
  private usdCost = 0
  private updatedMemory: Record<string, string> | null = null
  private agentSteps: AgentStep<any>[] = []
  private debugPrompts: string[] = []
  
  // resilience components
  private readonly aiExecutor: ResilientExecutor
  private readonly toolExecutor: ResilientExecutor
  private readonly summaryExecutor: ResilientExecutor

  constructor(
    private readonly ctx: NodeInvocationCallContext,
    private readonly toolManager: ToolManager,
    private readonly saveOutputs?: boolean
  ) {
    // create resilient executors for different operations
    this.aiExecutor = ResilientExecutorFactory.forAPI(
      `ai-${ctx.nodeConfig.nodeId}`,
      async () => {
        // fallback: return a simple error response
        lgg.warn(`[ResilientInvocationPipeline] Using AI fallback for node ${ctx.nodeConfig.nodeId}`)
        return {
          type: "error",
          message: "AI service unavailable, using fallback",
          nodeId: ctx.nodeConfig.nodeId,
          summary: "Service temporarily unavailable",
          cost: 0,
          agentSteps: [{ type: "error", return: "AI service unavailable" }],
        } as ProcessedResponse
      }
    )

    this.toolExecutor = ResilientExecutorFactory.custom({
      name: `tools-${ctx.nodeConfig.nodeId}`,
      retry: {
        maxAttempts: 3,
        initialDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2,
        retryableErrors: (error) => {
          // retry tool errors that are likely transient
          const message = error.message.toLowerCase()
          return (
            message.includes("timeout") ||
            message.includes("network") ||
            message.includes("connection")
          )
        },
      },
      timeout: 30000,
    })

    this.summaryExecutor = ResilientExecutorFactory.custom({
      name: `summary-${ctx.nodeConfig.nodeId}`,
      retry: {
        maxAttempts: 2,
        initialDelayMs: 500,
        maxDelayMs: 2000,
      },
      fallback: async () => ({
        summary: "Summary generation failed",
        usdCost: 0,
      }),
    })
  }

  /* ---------------------------------------------------------------------- */
  /*                              🛠  PREPARE                               */
  /* ---------------------------------------------------------------------- */

  public async prepare(): Promise<this> {
    // initialize tools with resilience
    const toolInitResult = await this.toolExecutor.execute(async () => {
      await this.toolManager.initializeTools()
      return await this.toolManager.getAllTools(this.ctx)
    })

    if (toolInitResult.success) {
      this.tools = toolInitResult.data!
    } else {
      lgg.error(
        `[ResilientInvocationPipeline] Tool initialization failed: ${toolInitResult.error?.message}`
      )
      this.tools = {} // continue with no tools
    }

    await prepareIncomingMessage(
      this.ctx,
      this.tools,
      this.ctx.nodeMemory,
      this.agentSteps
    )

    const hasOneTool = Object.keys(this.tools).length === 1

    // no need to prepare. this is handled in the multi-step loop.
    if (CONFIG.tools.experimentalMultiStepLoop) return this

    if (!hasOneTool && CONFIG.tools.usePrepareStepStrategy) {
      this.toolChoice = "auto"
    }

    return this
  }

  /* ---------------------------------------------------------------------- */
  /*                              🏃  EXECUTE                               */
  /* ---------------------------------------------------------------------- */

  public async execute(): Promise<this> {
    try {
      if (
        CONFIG.tools.experimentalMultiStepLoop &&
        Object.keys(this.tools)?.length > 0
      ) {
        if (this.ctx.toolStrategyOverride === "v3") {
          await this.runMultiStepLoopV3()
        } else {
          await this.runMultiStepLoopV2()
        }

        // sync the agentSteps and cost from multi-step loop result
        if (this.processedResponse && this.processedResponse.agentSteps) {
          this.agentSteps = this.processedResponse.agentSteps
          this.usdCost = this.processedResponse.cost || this.usdCost
        } else {
          lgg.error(
            `[ResilientInvocationPipeline] Multi-step loop result missing agentSteps`,
            this.processedResponse
          )
        }
      } else {
        this.processedResponse = await this.runSingleCall()

        // add node logs for single call path
        if (this.processedResponse && this.processedResponse.agentSteps) {
          this.agentSteps.push(...this.processedResponse.agentSteps)
        }

        // validate processedResponse
        if (!this.processedResponse) {
          throw new Error(
            "runSingleCall() returned null/undefined processedResponse"
          )
        }

        if (!this.processedResponse.type) {
          lgg.error(
            `[ResilientInvocationPipeline] processedResponse missing type property:`,
            this.processedResponse
          )
          throw new Error("processedResponse missing required 'type' property")
        }

        this.processedResponse = await this.finalizeSummary(
          this.processedResponse
        )
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const stack = err instanceof Error ? err.stack : undefined

      lgg.error(`[ResilientInvocationPipeline] Execution error: ${msg}`)
      lgg.error(
        `[ResilientInvocationPipeline] Node context: ${this.ctx.nodeConfig.nodeId}`
      )
      
      if (stack) {
        lgg.error(`[ResilientInvocationPipeline] Stack trace:`, stack)
      }

      // create error response instead of throwing
      this.processedResponse = {
        type: "error",
        nodeId: this.ctx.nodeConfig.nodeId,
        message: msg,
        summary: "Execution failed",
        cost: this.usdCost,
        agentSteps: this.agentSteps,
      }
    }

    return this
  }

  /* ---------------------------------------------------------------------- */
  /*                            📦  PROCESS                                 */
  /* ---------------------------------------------------------------------- */

  public async process(): Promise<NodeInvocationResult> {
    if (!this.processedResponse) {
      const message =
        "[ResilientInvocationPipeline] Processing error: empty processedResponse"
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
      this.agentSteps
    )

    return result
  }

  /* ---------------------------------------------------------------------- */
  /*                         🛤️   PRIVATE FLOW                              */
  /* ---------------------------------------------------------------------- */

  private async runSingleCall(): Promise<ProcessedResponse> {
    // log tool calling attempt
    if (verbose) {
      lgg.log(
        `[ResilientInvocationPipeline] Starting tool call with choice: ${JSON.stringify(this.toolChoice)}`
      )
      lgg.log(
        `[ResilientInvocationPipeline] Available tools: ${Object.keys(this.tools).join(", ")}`
      )
    }

    // build messages from incoming payload
    const incomingText = extractTextFromPayload(
      this.ctx.workflowMessageIncoming.payload
    )
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

    // execute AI call with resilience
    const aiResult = await this.aiExecutor.execute(async () => {
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

      if (!res.success) {
        throw new Error(res.error ?? "AI call failed")
      }

      return res
    })

    if (aiResult.success) {
      const res = aiResult.data!
      this.addCost(res.usdCost ?? 0)

      // process successful response
      const processed: ProcessedResponse = processResponseVercel({
        response: res.data as GenerateTextResult<ToolSet, any>,
        modelUsed: this.ctx.nodeConfig.modelName,
        nodeId: this.ctx.nodeConfig.nodeId,
      })

      if (verbose) {
        const ts = Date.now()
        saveInLoc(
          `${PATHS.node.logging}/debug/response_after_processing_${ts}_${this.ctx.nodeConfig.nodeId}`,
          JSONN.show(processed)
        )
      }

      // ensure summary exists
      let finalProcessed = processed
      if (!processed.summary && !isToolProcessed(processed)) {
        finalProcessed = {
          ...processed,
          nodeId: this.ctx.nodeConfig.nodeId,
          summary: isTextProcessed(processed)
            ? processed.content
            : isErrorProcessed(processed)
              ? processed.message
              : "",
        }
      }

      return finalProcessed
    } else {
      // ai call failed, use fallback if available
      if (aiResult.fallbackUsed && aiResult.data) {
        return aiResult.data as ProcessedResponse
      }

      // create error response
      return {
        nodeId: this.ctx.nodeConfig.nodeId,
        type: "error",
        message: aiResult.error?.message ?? "AI call failed",
        details: aiResult.error?.stack,
        cost: this.usdCost,
        agentSteps: [
          { type: "error", return: aiResult.error?.message ?? "AI call failed" },
        ],
      }
    }
  }

  private async runMultiStepLoopV2(): Promise<ProcessedResponse> {
    const processedResponse = await runMultiStepLoopV2Helper({
      ctx: this.ctx,
      tools: this.tools,
      agentSteps: this.agentSteps,
      model: this.ctx.nodeConfig.modelName,
      maxRounds,
      verbose,
      addCost: (cost) => this.addCost(cost),
      setUpdatedMemory: (memory) => {
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
      addCost: (cost) => this.addCost(cost),
      setUpdatedMemory: (memory) => {
        this.updatedMemory = memory
      },
      getTotalCost: () => this.usdCost,
    })
    this.processedResponse = processedResponse
    this.debugPrompts = debugPrompts
    return processedResponse
  }

  private async finalizeSummary(
    processed: ProcessedResponse
  ): Promise<ProcessedResponse> {
    // generate summary with resilience
    const summaryResult = await this.summaryExecutor.execute(async () => {
      return await createSummary(processed)
    })

    let summary = ""
    let summaryCost = 0

    if (summaryResult.success) {
      summary = summaryResult.data!.summary
      summaryCost = summaryResult.data!.usdCost
    } else {
      lgg.warn(
        `[ResilientInvocationPipeline] Summary generation failed: ${summaryResult.error?.message}`
      )
      summary = summaryResult.fallbackUsed && summaryResult.data
        ? summaryResult.data.summary
        : processed.summary || ""
    }

    this.addCost(summaryCost)

    // extract memory using makeLearning
    const toolLogs = extractToolLogs(processed)
    const learnings = await makeLearning({
      toolLogs,
      nodeSystemPrompt: this.ctx.nodeConfig.systemPrompt,
      currentMemory: this.ctx.nodeMemory ?? {},
    })

    // store memory updates
    if (learnings && !CONFIG.tools.experimentalMultiStepLoop) {
      this.updatedMemory = learnings.updatedMemory
    }

    // use existing summary if available, otherwise use the generated one
    const finalSummary = processed.summary || summary || ""

    saveInLogging(finalSummary, "finalSummary", ".md")

    // format learnings for response
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

  private addCost(c = 0): void {
    this.usdCost += c
  }

  public getAgentSteps(): AgentSteps {
    return this.agentSteps
  }

  public getUpdatedMemory(): Record<string, string> | null {
    return this.updatedMemory
  }

  public getCircuitBreakerStats() {
    return {
      ai: CircuitBreakerFactory.get(`ai-${this.ctx.nodeConfig.nodeId}`)?.getStats(),
      tools: CircuitBreakerFactory.get(`tools-${this.ctx.nodeConfig.nodeId}`)?.getStats(),
      summary: CircuitBreakerFactory.get(`summary-${this.ctx.nodeConfig.nodeId}`)?.getStats(),
    }
  }
}