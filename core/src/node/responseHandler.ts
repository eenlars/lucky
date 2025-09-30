// src/core/node/response/responseHandler.ts

import { getResponseContent } from "@core/messages/api/processResponse"
import { type ProcessedResponse } from "@core/messages/api/vercel/processResponse.types"
import { chooseHandoff } from "@core/messages/handoffs/main"
import type { AgentSteps } from "@core/messages/pipeline/AgentStep.types"
import { formatSummary } from "@core/messages/summaries"
// todo-circulardep: responseHandler imports from InvocationPipeline which imports back from responseHandler
import { HandoffMessageHandler } from "@core/messages/handoffs/HandoffMessageHandler"
import { extractTextFromPayload } from "@core/messages/MessagePayload"
import type { NodeInvocationCallContext } from "@core/messages/pipeline/input.types"
import type { NodeInvocationResult } from "@core/node/WorkFlowNode"
import { truncater } from "@core/utils/common/llmify"
import { lgg } from "@core/utils/logging/Logger"
import type { NodeMemory } from "@core/utils/memory/memorySchema"
import { saveNodeInvocationToDB } from "@core/utils/persistence/node/saveNodeInvocation"
import { validateAndDecide } from "@core/utils/validation/message"
import { CONFIG, isLoggingEnabled } from "@core/core-config/compat"

/**
 * Handles successful response processing.
 */
export async function handleSuccess(
  context: NodeInvocationCallContext,
  response: ProcessedResponse,
  debugPrompts: string[],
  extraCost?: number,
  updatedMemory?: NodeMemory | null,
  agentSteps?: AgentSteps,
): Promise<NodeInvocationResult> {
  const { nodeConfig, workflowFiles, workflowConfig } = context
  if (!response) {
    return handleError({
      context,
      errorMessage: "no response 1",
      summary: "no response 1",
      agentSteps: [{ type: "text", return: "no response 1" }],
      debugPrompts,
    })
  }

  // Debug logging for tool calls
  if (response.agentSteps) {
    lgg.onlyIf(isLoggingEnabled("Tools"), `[handleSuccess] Tool calls found: ${response.agentSteps.length} outputs`)
  } else {
    lgg.onlyIf(isLoggingEnabled("Tools"), `[handleSuccess] No tool calls found for response type: ${response.type}`)
  }

  // Collect files used by this node invocation
  const filesUsed: string[] = []
  if (workflowFiles) {
    filesUsed.push(...workflowFiles.map(file => file.filePath))
  }

  // Compute full output string for validation and storage
  const finalNodeInvocationOutput = getResponseContent(response) ?? ""
  // Ensure we always have non-empty text to hand off to the next node
  const incomingPrompt = extractTextFromPayload(context.workflowMessageIncoming.payload)
  const baseTextForNext =
    (finalNodeInvocationOutput && finalNodeInvocationOutput.trim().length > 0
      ? finalNodeInvocationOutput
      : incomingPrompt && incomingPrompt.trim().length > 0
        ? incomingPrompt
        : nodeConfig.systemPrompt) || ""

  // Validate output before handoff decision
  const { shouldProceed, validationError, validationCost } = await validateAndDecide({
    nodeOutput: finalNodeInvocationOutput,
    workflowMessage: context.workflowMessageIncoming,
    systemPrompt: nodeConfig.systemPrompt,
    nodeId: nodeConfig.nodeId,
  })

  // Handle validation blocking
  // todo-errorhandling: validation errors not properly propagated up call stack
  if (!shouldProceed && validationError) {
    return handleError({
      context,
      errorMessage: validationError,
      summary: "validation error",
      agentSteps: response.agentSteps ?? [{ type: "error", return: validationError }],
      debugPrompts,
    })
  }

  // Prefer using HandoffMessageHandler to create outgoing messages (minimal + effective)
  let outgoingMessages:
    | {
        toNodeId: string
        payload: import("@core/messages/MessagePayload").Payload
      }[]
    | undefined
  try {
    if (nodeConfig) {
      const handler = new HandoffMessageHandler(nodeConfig)
      outgoingMessages = handler.buildMessages(agentSteps, {
        currentOutputText: baseTextForNext,
        // kind defaults to coordinationType; no override needed here
      })
    }
  } catch (e) {
    lgg.onlyIf(
      isLoggingEnabled("Messaging"),
      `[handleSuccess] HandoffMessageHandler failed, falling back: ${String(e)}`,
    )
  }

  let nextIds: string[]
  let handoffCost = 0
  // todo-typesafety: replace 'any' with proper message type - violates CLAUDE.md "we hate any"
  let replyMessage: any

  if (outgoingMessages && outgoingMessages.length > 0) {
    nextIds = outgoingMessages.map(m => m.toNodeId)
    // Keep replyMessage for backward compatibility (will be overridden per-target in queueRun)
    replyMessage = outgoingMessages[0].payload
  } else {
    // Fallback: existing selection logic
    // Check if this is a node that should send to multiple targets (parallel processing)
    const isParallelNode =
      nodeConfig.handOffType === "parallel" && nodeConfig.handOffs.length > 1 && !nodeConfig.handOffs.includes("end")

    if (isParallelNode) {
      nextIds = nodeConfig.handOffs
      replyMessage = {
        kind: CONFIG.coordinationType === "sequential" ? "sequential" : "delegation",
        prompt: baseTextForNext,
        context: "",
      }
      handoffCost = 0
    } else {
      const {
        handoff: nextNodeId,
        usdCost: cost,
        replyMessage: reply,
      } = await chooseHandoff({
        systemPrompt: nodeConfig.systemPrompt,
        workflowMessage: context.workflowMessageIncoming,
        handOffs: nodeConfig.handOffs,
        content: CONFIG.workflow.handoffContent === "full" ? baseTextForNext : truncater(baseTextForNext, 500),
        agentSteps: agentSteps ?? undefined,
        workflowConfig: context.workflowConfig,
      })

      nextIds = [nextNodeId]
      handoffCost = cost
      replyMessage = reply
    }
  }

  const totalUsdCost = response.cost + validationCost + handoffCost + (extraCost ?? 0)

  // save to db
  let nodeInvocationId: string
  if (context.skipDatabasePersistence) {
    // Skip database save and use mock ID
    nodeInvocationId = `mock-invocation-${nodeConfig.nodeId}-${Date.now()}`
  } else {
    const result = await saveNodeInvocationToDB({
      nodeId: nodeConfig.nodeId,
      start_time: context.startTime,
      messageId: context.workflowMessageIncoming.messageId,
      usdCost: response.cost,
      output: finalNodeInvocationOutput,
      workflowInvocationId: context.workflowInvocationId,
      agentSteps: response.agentSteps,
      summary: response.summary ?? "",
      files: filesUsed.length > 0 ? filesUsed : undefined,
      workflowVersionId: context.workflowVersionId,
      model: context.nodeConfig.modelName,
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
    outgoingMessages,
    summaryWithInfo: formatSummary(response.summary ?? "", nodeConfig.nodeId),
    agentSteps: response.agentSteps ?? [{ type: "text", return: finalNodeInvocationOutput }],
    updatedMemory: updatedMemory ?? undefined,
    debugPrompts,
  }
}

// Handles error cases with consistent structure.
export async function handleError({
  context,
  errorMessage,
  summary,
  agentSteps,
  debugPrompts,
}: {
  context: NodeInvocationCallContext
  errorMessage: string
  summary: string
  agentSteps?: AgentSteps
  debugPrompts: string[]
}): Promise<NodeInvocationResult> {
  lgg.error(errorMessage)
  // Collect files used by this node invocation (even in error cases)
  const filesUsed: string[] = []
  if (context.workflowFiles) {
    filesUsed.push(...context.workflowFiles.map(file => file.filePath))
  }

  // Respect skipDatabasePersistence similarly to handleSuccess
  const nodeInvocationId = context.skipDatabasePersistence
    ? `mock-invocation-${context.nodeConfig.nodeId}-${Date.now()}`
    : (
        await saveNodeInvocationToDB({
          nodeId: context.nodeConfig.nodeId,
          start_time: context.startTime,
          messageId: context.workflowMessageIncoming.messageId,
          usdCost: 0,
          output: errorMessage,
          workflowInvocationId: context.workflowInvocationId,
          agentSteps,
          summary,
          files: filesUsed.length > 0 ? filesUsed : undefined,
          workflowVersionId: context.workflowVersionId,
          model: context.nodeConfig.modelName,
        })
      ).nodeInvocationId

  const {
    handoff: nextNodeId,
    usdCost,
    replyMessage,
  } = await chooseHandoff({
    systemPrompt: context.nodeConfig.systemPrompt,
    workflowMessage: context.workflowMessageIncoming,
    handOffs: context.nodeConfig.handOffs,
    content: `error: ${truncater(errorMessage, 1000)}`,
  })

  const summaryWithInfo = formatSummary(summary, context.nodeConfig.nodeId)

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
    agentSteps: agentSteps ?? [{ type: "text", return: errorMessage }],
    debugPrompts,
  }
}
