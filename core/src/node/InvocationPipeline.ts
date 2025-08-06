import { lgg } from "@core/utils/logging/Logger"
import { getDefaultModels } from "@core/utils/spending/defaultModels"

import {
  extractPromptFromPayload,
  type Payload,
} from "@core/messages/MessagePayload"
import { WorkflowMessage } from "@core/messages/WorkflowMessage"
import {
  processModelResponse,
  type NodeLog,
} from "@core/messages/api/processResponse"
import {
  isErrorProcessed,
  isTextProcessed,
  isToolProcessed,
  type ProcessedResponse,
} from "@core/messages/api/processResponse.types"
import { sendAI } from "@core/messages/api/sendAI"
import { buildMessages } from "@core/messages/create/buildMessages"
import { createSummary } from "@core/messages/summaries"
import type { NodeInvocationResult } from "@core/node/WorkFlowNode"
import { extractToolLogs } from "@core/node/extractToolLogs"
import { handleError, handleSuccess } from "@core/node/responseHandler"
import type { ToolManager } from "@core/node/toolManager"
import { explainSubsetOfTools } from "@core/prompts/explainTools"
import { makeLearning } from "@core/prompts/makeLearning"
import { selectToolStrategy } from "@core/tools/any/selectToolStrategy"
import type { ToolExecutionContext } from "@core/tools/toolFactory"
import { isNir } from "@core/utils/common/isNir"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { saveInLoc, saveInLogging } from "@runtime/code_tools/file-saver/save"
import { CONFIG, PATHS } from "@runtime/settings/constants"
import type { ModelName } from "@runtime/settings/models"
import { JSONN } from "@shared/utils/files/json/jsonParse"
import type { CoreMessage, GenerateTextResult, ToolChoice, ToolSet } from "ai"
import { runMultiStepLoopV2Helper } from "./strategies/MultiStepLoopV2"
import { runMultiStepLoopV3Helper } from "./strategies/MultiStepLoopV3"

const maxRounds = CONFIG.tools.experimentalMultiStepLoopMaxRounds

const verbose = CONFIG.logging.override.InvocationPipeline

export interface NodeInvocationCallContext extends ToolExecutionContext {
  nodeId: string
  startTime: string
  workflowMessageIncoming: WorkflowMessage
  workflowInvocationId: string
  handOffs: string[]
  handOffType?: "conditional" | "sequential" | "parallel"
  nodeDescription: string
  nodeSystemPrompt: string
  nodeMemory?: Record<string, string>
  replyMessage: Payload | null
  workflowVersionId: string
  mainWorkflowGoal: string
  model: ModelName
  workflowConfig?: WorkflowConfig // Added for hierarchical role inference
  skipDatabasePersistence?: boolean
}

/* -------------------------------------------------------------------------- */
/*                         🚀  INVOCATION  PIPELINE                           */
/* -------------------------------------------------------------------------- */

export class InvocationPipeline {
  /* ------------------------------- state --------------------------------- */
  private sdkMessages: CoreMessage[] = []
  private tools: ToolSet = {}
  private toolChoice: ToolChoice<ToolSet> | null = null

  private processedResponse: ProcessedResponse | null = null
  private usdCost = 0
  private updatedMemory: Record<string, string> | null = null
  private toolUsage: NodeLog<any>[] = []
  private debugPrompts: string[] = []

  constructor(
    private readonly ctx: NodeInvocationCallContext,
    private readonly toolManager: ToolManager,
    private readonly model: ModelName,
    private readonly saveOutputs?: boolean
  ) {}

  /* ---------------------------------------------------------------------- */
  /*                              🛠  PREPARE                               */
  /* ---------------------------------------------------------------------- */

  public async prepare(): Promise<this> {
    await this.toolManager.initializeTools()
    this.tools = await this.toolManager.getAllTools(this.ctx)

    this.sdkMessages = buildMessages({
      workflowMessageIncoming: this.ctx.workflowMessageIncoming,
      workflowInvocationId: this.ctx.workflowInvocationId,
      handOffs: this.ctx.handOffs.join(", "),
      nodeDescription: this.ctx.nodeDescription,
      nodeSystemPrompt: this.ctx.nodeSystemPrompt,
      nodeMemory: this.ctx.nodeMemory,
      workflowFiles: this.ctx.workflowFiles,
      mainWorkflowGoal: this.ctx.mainWorkflowGoal,
    })

    const toolsAvailable = Object.keys(this.tools)

    const { data: prepareThinking } = await sendAI({
      model: getDefaultModels().default,
      mode: "text",
      messages: [
        {
          role: "user",
          content: `
          main_workflow_goal: ${this.ctx.mainWorkflowGoal}
          evaluation_criteria: 100% accuracy test
          context: we're currently one workflow node, part of a larger system

          current_workflow_node:
          currently, we're one node within the workflow. the node has the following instructions:
          - ${this.ctx.nodeSystemPrompt}
          ${!isNir(toolsAvailable) ? `resources: ${explainSubsetOfTools(toolsAvailable)}` : ""}
          ${!isNir(this.ctx.nodeMemory) ? `current_memory: ${JSON.stringify(this.ctx.nodeMemory, null, 2)}` : ""}

          your task: output what this node can do to score 100% on the eval, keep it as concise as possible, but make sure you cover all the steps.
            `,
        },
      ],
    })

    if (prepareThinking && prepareThinking.text) {
      const reasoning = prepareThinking.text
      this.toolUsage.push({
        type: "reasoning",
        return: reasoning,
      })
    }

    const prompt = extractPromptFromPayload(
      this.ctx.workflowMessageIncoming.payload
    )
    const hasOneTool = Object.keys(this.tools).length === 1

    // no need to prepare. this is handled in the multi-step loop.
    if (CONFIG.tools.experimentalMultiStepLoop) return this

    if (!hasOneTool && CONFIG.tools.usePrepareStepStrategy) {
      this.toolChoice = await selectToolStrategy(
        this.tools,
        this.ctx.nodeSystemPrompt,
        prompt,
        (cost) => this.addCost(cost)
      )
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
        await this.runMultiStepLoopV2()

        // Sync the toolUsage and cost from multi-step loop result
        if (this.processedResponse && this.processedResponse.toolUsage) {
          // Sync both the toolUsage outputs and cost from the multi-step loop
          this.toolUsage = this.processedResponse.toolUsage.outputs
          this.usdCost = this.processedResponse.cost || this.usdCost
        } else {
          lgg.error(
            `[InvocationPipeline_runMultiStepLoop]:`,
            this.processedResponse
          )
        }
      } else {
        this.processedResponse = await this.runSingleCall()

        // Add node logs for single call path BEFORE finalizeSummary
        if (this.processedResponse && this.processedResponse.toolUsage) {
          this.toolUsage.push(...this.processedResponse.toolUsage.outputs)
        }

        // Validate processedResponse before proceeding
        if (!this.processedResponse) {
          throw new Error(
            "runSingleCall() returned null/undefined processedResponse"
          )
        }

        if (!this.processedResponse.type) {
          lgg.error(
            `[InvocationPipeline] processedResponse missing type property:`,
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

      lgg.error(`[InvocationPipeline] Execution error: ${msg}`)
      lgg.error(`[InvocationPipeline] Node context: ${this.ctx.nodeId}`)
      lgg.error(`[InvocationPipeline] Workflow: ${this.ctx.workflowVersionId}`)
      lgg.error(`[InvocationPipeline] Model: ${this.model}`)
      lgg.error(
        `[InvocationPipeline] Tools available: ${Object.keys(this.tools).join(", ")}`
      )

      if (stack) {
        lgg.error(`[InvocationPipeline] Stack trace:`, stack)
      }

      if (err instanceof Error && err.cause) {
        lgg.error(`[InvocationPipeline] Error cause:`, err.cause)
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
        toolUsage: undefined,
        debugPrompts: this.debugPrompts,
      })
    }

    const response = this.processedResponse

    if (isErrorProcessed(response)) {
      return handleError({
        context: this.ctx,
        errorMessage: response.message,
        summary: response.summary ?? "there was an error",
        toolUsage: response.toolUsage,
        debugPrompts: this.debugPrompts,
      })
    }

    const result = handleSuccess(
      this.ctx,
      response,
      this.debugPrompts,
      this.usdCost,
      this.updatedMemory,
      { outputs: this.toolUsage, totalCost: this.usdCost }
    )

    return result
  }

  /* ---------------------------------------------------------------------- */
  /*                         🛤️   PRIVATE FLOW                              */
  /* ---------------------------------------------------------------------- */

  private async runSingleCall(): Promise<ProcessedResponse> {
    // Log tool calling attempt
    if (verbose) {
      lgg.log(
        `[InvocationPipeline] Starting tool call with choice: ${JSON.stringify(this.toolChoice)}`
      )
      lgg.log(
        `[InvocationPipeline] Available tools: ${Object.keys(this.tools).join(", ")}`
      )
    }

    const res = await sendAI({
      model: getDefaultModels().nano,
      messages: this.sdkMessages,
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

    const processed = processModelResponse({
      response: res.data as GenerateTextResult<ToolSet, any>,
      modelUsed: this.model,
      nodeId: this.ctx.nodeId,
    })

    if (verbose) {
      const ts = Date.now()
      saveInLoc(
        `${PATHS.node.logging}/debug/response_after_processing_${ts}_${this.ctx.nodeId}`,
        JSONN.show(processed)
      )
    }

    // ensure summary exists
    let finalProcessed = processed
    if (!processed.summary && !isToolProcessed(processed)) {
      finalProcessed = {
        ...processed,
        nodeId: this.ctx.nodeId,
        summary: isTextProcessed(processed)
          ? processed.content
          : isErrorProcessed(processed)
            ? processed.message
            : "",
      }
    }

    return finalProcessed
  }

  /* ---------------------------------------------------------------------- */

  private async runMultiStepLoopV2(): Promise<ProcessedResponse> {
    const processedResponse = await runMultiStepLoopV2Helper({
      ctx: this.ctx,
      tools: this.tools,
      toolUsage: this.toolUsage,
      model: this.model,
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
      toolUsage: this.toolUsage,
      model: this.model,
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

  /* ------------------------------------------------------------------ */

  private async finalizeSummary(
    processed: ProcessedResponse
  ): Promise<ProcessedResponse> {
    // Generate summary if not already present
    const { summary, usdCost } = await createSummary(processed)
    this.addCost(usdCost)

    // Extract memory using makeLearning (same as runMultiStepLoop)
    const toolLogs = extractToolLogs(processed)
    const learnings = await makeLearning({
      toolLogs,
      nodeSystemPrompt: this.ctx.nodeSystemPrompt,
      currentMemory: this.ctx.nodeMemory ?? {},
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
      nodeId: this.ctx.nodeId,
      summary: finalSummary,
      learnings: learningsString,
      cost: this.usdCost,
      toolUsage: { outputs: this.toolUsage, totalCost: this.usdCost },
    }
  }

  private addCost(c = 0): void {
    this.usdCost += c
  }

  public getToolUsage(): { outputs: NodeLog<any>[]; totalCost: number } {
    return { outputs: this.toolUsage, totalCost: this.usdCost }
  }

  public getUpdatedMemory(): Record<string, string> | null {
    return this.updatedMemory
  }
}
