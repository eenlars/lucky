// src/core/node/response/responseHandler.ts

import {
  getResponseContent,
  type NodeLogs,
} from "@messages/api/processResponse"
import { type ProcessedResponse } from "@messages/api/processResponse.types"
import { chooseHandoff } from "@messages/handoffs/main"
import { formatSummary } from "@messages/summaries"
// todo-circulardep: responseHandler imports from InvocationPipeline which imports back from responseHandler
import type { NodeInvocationCallContext } from "@node/InvocationPipeline"
import type { NodeInvocationResult } from "@node/WorkFlowNode"
import { truncater } from "@utils/common/llmify"
import { saveNodeInvocationToDB } from "@utils/persistence/node/saveNodeInvocation"
import { validateAndDecide } from "@utils/validation/message"
import { lgg } from "@logger"
import { getSettings, getLogging } from "@utils/config/runtimeConfig"

/**
 * Handles successful response processing.
 */
export async function handleSuccess(
  context: NodeInvocationCallContext,
  response: ProcessedResponse,
  debugPrompts: string[],
  extraCost?: number,
  updatedMemory?: Record<string, string> | null,
  toolUsage?: NodeLogs
): Promise<NodeInvocationResult> {
  if (!response) {
    return handleError({
      context,
      errorMessage: "no response 1",
      summary: "no response 1",
      toolUsage: {
        outputs: [{ type: "text", return: "no response 1" }],
        totalCost: 0,
      },
      debugPrompts,
    })
  }

  // Debug logging for tool calls
  if (response.toolUsage) {
    lgg.onlyIf(
      getLogging().Tools,
      `[handleSuccess] Tool calls found: ${response.toolUsage.outputs.length} outputs`
    )
  } else {
    lgg.onlyIf(
      getLogging().Tools,
      `[handleSuccess] No tool calls found for response type: ${response.type}`
    )
  }

  // Collect files used by this node invocation
  const filesUsed: string[] = []
  if (context.workflowFiles) {
    filesUsed.push(...context.workflowFiles.map((file) => file.filePath))
  }

  // Compute full output string for validation and storage
  const finalNodeInvocationOutput = getResponseContent(response) ?? ""

  // Validate output before handoff decision
  const { shouldProceed, validationError, validationCost } =
    await validateAndDecide({
      nodeOutput: finalNodeInvocationOutput,
      workflowMessage: context.workflowMessageIncoming,
      systemPrompt: context.nodeSystemPrompt,
      nodeId: context.nodeId,
    })

  // Handle validation blocking
  // todo-errorhandling: validation errors not properly propagated up call stack
  if (!shouldProceed && validationError) {
    return handleError({
      context,
      errorMessage: validationError,
      summary: "validation error",
      toolUsage: response.toolUsage ?? {
        outputs: [{ type: "error", return: validationError }],
        totalCost: 0,
      },
      debugPrompts,
    })
  }

  // Check if this is a node that should send to multiple targets (parallel processing)
  // Only enable parallel processing if handOffType is explicitly set to "parallel"
  const isParallelNode =
    context.handOffType === "parallel" &&
    context.handOffs.length > 1 &&
    !context.handOffs.includes("end")

  let nextIds: string[]
  let handoffCost = 0
  // todo-typesafety: replace 'any' with proper message type - violates CLAUDE.md "we hate any"
  let replyMessage: any

  if (isParallelNode) {
    // For parallel processing, send to all handoffs directly
    nextIds = context.handOffs
    replyMessage = {
      kind:
        getSettings().coordinationType === "sequential"
          ? "sequential"
          : "delegation",
      prompt: finalNodeInvocationOutput,
      context: "",
    }
    handoffCost = 0
  } else {
    // Use normal handoff logic for single target
    const {
      handoff: nextNodeId,
      usdCost: cost,
      replyMessage: reply,
    } = await chooseHandoff({
      systemPrompt: context.nodeSystemPrompt,
      workflowMessage: context.workflowMessageIncoming,
      handOffs: context.handOffs,
      content:
        getSettings().workflow.handoffContent === "full"
          ? finalNodeInvocationOutput
          : truncater(finalNodeInvocationOutput, 500),
      toolUsage: toolUsage ?? undefined,
      workflowConfig: context.workflowConfig,
    })

    nextIds = [nextNodeId]
    handoffCost = cost
    replyMessage = reply
  }

  const totalUsdCost =
    response.cost + validationCost + handoffCost + (extraCost ?? 0)

  // save to db
  let nodeInvocationId: string
  if (context.skipDatabasePersistence) {
    // Skip database save and use mock ID
    nodeInvocationId = `mock-invocation-${context.nodeId}-${Date.now()}`
  } else {
    const result = await saveNodeInvocationToDB({
      nodeId: context.nodeId,
      start_time: context.startTime,
      messageId: context.workflowMessageIncoming.messageId,
      usdCost: response.cost,
      output: finalNodeInvocationOutput,
      workflowInvocationId: context.workflowInvocationId,
      toolUsage: response.toolUsage,
      summary: response.summary ?? "",
      files: filesUsed.length > 0 ? filesUsed : undefined,
      workflowVersionId: context.workflowVersionId,
      model: context.model,
      updatedMemory: updatedMemory || undefined,
    })
    nodeInvocationId = result.nodeInvocationId
  }

  return {
    nodeInvocationId,
    nodeInvocationFinalOutput: finalNodeInvocationOutput,
    usdCost: totalUsdCost,
    nextIds: nextIds,
    replyMessage,
    summaryWithInfo: formatSummary(response.summary ?? "", context.nodeId),
    toolUsage: response.toolUsage ?? {
      outputs: [{ type: "text", return: finalNodeInvocationOutput }],
      totalCost: 0,
    },
    updatedMemory: updatedMemory ?? undefined,
    debugPrompts,
  }
}

// Handles error cases with consistent structure.
export async function handleError({
  context,
  errorMessage,
  summary,
  toolUsage,
  debugPrompts,
}: {
  context: NodeInvocationCallContext
  errorMessage: string
  summary: string
  toolUsage?: NodeLogs
  debugPrompts: string[]
}): Promise<NodeInvocationResult> {
  lgg.error(errorMessage)
  // Collect files used by this node invocation (even in error cases)
  const filesUsed: string[] = []
  if (context.workflowFiles) {
    filesUsed.push(...context.workflowFiles.map((file) => file.filePath))
  }

  const { nodeInvocationId } = await saveNodeInvocationToDB({
    nodeId: context.nodeId,
    start_time: context.startTime,
    messageId: context.workflowMessageIncoming.messageId,
    usdCost: 0,
    output: errorMessage,
    workflowInvocationId: context.workflowInvocationId,
    toolUsage,
    summary,
    files: filesUsed.length > 0 ? filesUsed : undefined,
    workflowVersionId: context.workflowVersionId,
    model: context.model,
  })

  const {
    handoff: nextNodeId,
    usdCost,
    replyMessage,
  } = await chooseHandoff({
    systemPrompt: context.nodeSystemPrompt,
    workflowMessage: context.workflowMessageIncoming,
    handOffs: context.handOffs,
    content: `error: ${truncater(errorMessage, 1000)}`,
  })

  const summaryWithInfo = formatSummary(summary, context.nodeId)

  return {
    nodeInvocationId,
    nodeInvocationFinalOutput: errorMessage,
    usdCost: usdCost,
    nextIds: [nextNodeId],
    error: {
      message: errorMessage,
    },
    summaryWithInfo,
    replyMessage,
    toolUsage: toolUsage ?? {
      outputs: [{ type: "text", return: errorMessage }],
      totalCost: 0,
    },
    debugPrompts,
  }
}
