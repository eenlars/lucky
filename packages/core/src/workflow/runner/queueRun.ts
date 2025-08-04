// src/core/workflow/queueRun.ts

import type { NodeLogs } from "@/messages/api/processResponse"
import type {
  AggregatedPayload,
  MessageType,
} from "@/messages/MessagePayload"
import type { InvocationSummary } from "@/messages/summaries"
import { WorkflowMessage } from "@/messages/WorkflowMessage"
import type { ToolExecutionContext } from "@/tools/toolFactory"
import type { Json } from "@/utils/clients/supabase/types"
import { JSONN } from "@/utils/file-types/json/jsonParse"
import { lgg } from "@/utils/logging/Logger"
import { updateWorkflowInvocationInDatabase } from "@/utils/persistence/workflow/registerWorkflow"
import { updateWorkflowMemory } from "@/utils/persistence/workflow/updateNodeMemory"
import { R, type RS } from "@/utils/types"
import { getNodeRole } from "@/utils/validation/workflow/verifyHierarchical"
import { CONFIG } from "@/runtime/settings/constants"
import { calculateFeedback } from "@workflow/actions/analyze/calculate-fitness/calculateFeedback"
import { calculateFitness } from "@workflow/actions/analyze/calculate-fitness/calculateFitness"
import type { FitnessOfWorkflow } from "@workflow/actions/analyze/calculate-fitness/fitness.types"
import type { Workflow } from "@workflow/Workflow"
import chalk from "chalk"

export type QueueRunParams = {
  workflow: Workflow
  workflowInput: string
  workflowInvocationId: string
}

// Fix to use ProcessedResponse
export type QueueRunResult = {
  success: boolean
  nodeOutputs: NodeLogs[]
  finalWorkflowOutput: string
  error?: string
  totalTime: number
  totalCost: number
}

export type EvaluationResult = {
  transcript: NodeLogs[]
  summaries: InvocationSummary[]
  fitness: FitnessOfWorkflow
  feedback: string
  finalWorkflowOutput: string
}

export type AggregateEvaluationResult = {
  results: EvaluationResult[]
  totalCost: number
  averageFitness: FitnessOfWorkflow
  averageFeedback: string
}

const coordinationType = CONFIG.coordinationType
const verbose = CONFIG.logging.override.Memory ?? false

export async function queueRun({
  workflow,
  workflowInput,
  workflowInvocationId,
}: QueueRunParams): Promise<QueueRunResult> {
  lgg.log(
    `[queueRun] Starting for workflow ${workflow.getWorkflowVersionId()}, invocation ${workflowInvocationId}`
  )

  const entryNodeId = workflow.getEntryNodeId()
  const currentNode = workflow.getNode(entryNodeId)
  if (!currentNode) {
    const error = `No node '${entryNodeId}'`
    lgg.error(`[queueRun] ${error}`)
    throw new Error(error)
  }

  lgg.onlyIf(verbose, `[queueRun] Entry node found: ${entryNodeId}`)

  const nodes = workflow.getNodes()
  const nodeMap = new Map(nodes.map((node) => [node.nodeId, node]))
  const workflowVersionId = workflow.getWorkflowVersionId()

  lgg.onlyIf(verbose, `[queueRun] Workflow has ${nodes.length} nodes`)

  const nodeOutputs: NodeLogs[] = []
  let seq = 0
  let totalCost = 0
  let nodeInvocations = 0
  const summaries: InvocationSummary[] = []
  const startTime = Date.now()
  const maxNodeInvocations = CONFIG.workflow.maxNodeInvocations
  let lastNodeOutput = ""

  // Message queue to process
  const messageQueue: WorkflowMessage[] = []

  // Aggregation storage for nodes with waitingFor
  const waitingMessages = new Map<string, WorkflowMessage[]>()

  const messageType: MessageType =
    coordinationType === "sequential" ? "sequential" : "delegation"

  // Add initial message to the queue
  const initialMessage = new WorkflowMessage({
    originInvocationId: null,
    fromNodeId: "start",
    toNodeId: entryNodeId,
    seq: seq++,
    payload: {
      kind: messageType,
      prompt: workflowInput.replace(/\n/g, " ").replace(/\s+/g, " "),
    },
    wfInvId: workflowInvocationId,
  })

  messageQueue.push(initialMessage)
  lgg.onlyIf(
    verbose,
    `[queueRun] Initial message queued, starting processing loop`
  )

  // Process messages until queue is empty
  while (messageQueue.length > 0) {
    let currentMessage = messageQueue.shift()!
    lgg.onlyIf(
      verbose,
      `[queueRun] Processing message to node ${currentMessage.toNodeId}`
    )

    // Check max node invocations limit
    if (nodeInvocations >= maxNodeInvocations) {
      lgg.warn(`[queueRun] Max node invocations reached: ${maxNodeInvocations}`)
      break
    }

    // Handle 'end' node as a special case - don't skip processing
    if (currentMessage.toNodeId === "end") {
      lgg.onlyIf(verbose, `[queueRun] Reached end node, continuing`)
      continue
    }

    const targetNode = nodeMap.get(currentMessage.toNodeId)

    if (!targetNode) {
      const error = `Target workflow node ${currentMessage.toNodeId} not found`
      lgg.error(`[queueRun] ${error}`)
      throw new Error(error)
    }

    lgg.onlyIf(
      verbose,
      `[queueRun] Found target node ${currentMessage.toNodeId}, invoking`
    )

    // Check if this node is waiting for multiple messages
    const nodeConfig = workflow
      .getConfig()
      .nodes.find((n) => n.nodeId === currentMessage.toNodeId)
    const waitingFor = nodeConfig?.waitingFor || nodeConfig?.waitFor

    if (waitingFor && waitingFor.length > 0) {
      // Add message to waiting collection
      const waitingKey = currentMessage.toNodeId
      if (!waitingMessages.has(waitingKey)) {
        waitingMessages.set(waitingKey, [])
      }
      waitingMessages.get(waitingKey)!.push(currentMessage)

      // Check if all required messages are received
      const receivedMessages = waitingMessages.get(waitingKey)!
      const receivedFromNodes = new Set(
        receivedMessages.map((m) => m.fromNodeId)
      )
      const allReceived = waitingFor.every((nodeId) =>
        receivedFromNodes.has(nodeId)
      )

      if (!allReceived) {
        // Still waiting for more messages, continue to next message
        continue
      }

      // All messages received, create aggregated message
      const aggregatedPayload: AggregatedPayload = {
        kind: "aggregated",
        messages: receivedMessages.map((msg) => ({
          fromNodeId: msg.fromNodeId,
          payload: msg.payload,
        })),
      }

      // Create new aggregated message
      const aggregatedMessage = new WorkflowMessage({
        originInvocationId: currentMessage.originInvocationId,
        fromNodeId: "aggregator",
        toNodeId: currentMessage.toNodeId,
        seq: currentMessage.seq,
        payload: aggregatedPayload,
        wfInvId: currentMessage.wfInvId,
      })

      // Replace current message with aggregated one
      currentMessage = aggregatedMessage

      // Clean up waiting state
      waitingMessages.delete(waitingKey)
    }

    // Validate hierarchical message flow if coordination type is hierarchical
    if (coordinationType === "hierarchical") {
      const workflowConfig = workflow.getConfig()
      const fromNodeRole = getNodeRole(
        currentMessage.fromNodeId,
        workflowConfig
      )
      const toNodeRole = getNodeRole(currentMessage.toNodeId, workflowConfig)

      // Validate hierarchical constraints
      if (fromNodeRole === "worker" && toNodeRole === "worker") {
        throw new Error(
          `Invalid hierarchical flow: Worker '${currentMessage.fromNodeId}' cannot send message to worker '${currentMessage.toNodeId}'. ` +
            `Workers can only communicate with the orchestrator or 'end'.`
        )
      }

      // Additional validation for delegation messages
      if (
        currentMessage.payload.kind === "delegation" &&
        fromNodeRole !== "orchestrator" &&
        currentMessage.fromNodeId !== "start"
      ) {
        throw new Error(
          `Invalid hierarchical flow: Only the orchestrator can send delegation messages. ` +
            `Node '${currentMessage.fromNodeId}' (role: ${fromNodeRole}) attempted to delegate.`
        )
      }
    }
    const toolContext: ToolExecutionContext =
      workflow.getToolExecutionContext(workflowInvocationId)

    lgg.onlyIf(
      verbose,
      `[queueRun] Starting node invocation for ${targetNode.nodeId}`
    )

    const {
      nodeInvocationFinalOutput,
      usdCost,
      nodeInvocationId,
      replyMessage,
      nextIds,
      error,
      summaryWithInfo,
      updatedMemory,
      toolUsage,
    } = await targetNode.invoke({
      workflowMessageIncoming: currentMessage,
      workflowVersionId,
      workflowConfig: workflow.getConfig(), // Added for hierarchical role inference
      ...toolContext,
    })

    lastNodeOutput = nodeInvocationFinalOutput

    lgg.onlyIf(
      verbose,
      `[queueRun] Node invocation completed for ${targetNode.nodeId}, nodeInvocationId: ${nodeInvocationId}`
    )

    if (error) {
      lgg.error(
        `[queueRun] Node invocation error for ${targetNode.nodeId}: ${error}`
      )
    }

    nodeInvocations++

    currentMessage.updateMessage({
      target_invocation_id: nodeInvocationId,
    })

    // Collect NodeLogs objects from node invocations
    nodeOutputs.push(toolUsage)
    totalCost += usdCost

    summaries.push(summaryWithInfo)

    // Check if this is a terminal node (hands off to "end")
    const isTerminalNode = nextIds.includes("end")

    lgg.onlyIf(
      verbose,
      `[queueRun] Node ${targetNode.nodeId} completed, nextIds: [${nextIds.join(", ")}], isTerminal: ${isTerminalNode}`
    )

    // Save memory updates if provided
    if (updatedMemory) {
      // Update the node's memory in the workflow config
      const nodeConfig = workflow
        .getConfig()
        .nodes.find((n) => n.nodeId === targetNode.nodeId)
      if (nodeConfig) {
        nodeConfig.memory = updatedMemory
      }

      // If this is a terminal node, we should persist the memory update
      if (isTerminalNode && verbose) {
        lgg.log(
          chalk.green(
            `[queueRun] Terminal node ${targetNode.nodeId} updated memory: ${JSON.stringify(updatedMemory)}`
          )
        )
      }
    }

    // Add next messages to the queue
    for (const nextId of nextIds) {
      // Create per-target customized messages for parallel processing
      // todo-typesafety: replace 'any' with proper payload type - violates CLAUDE.md "we hate any"
      let messagePayload: any
      if (error) {
        messagePayload = {
          kind: "error",
          message: error.message,
          stack: error.stack,
        }
      } else if (nextIds.length > 1 && !nextIds.includes("end")) {
        // Branched processing - customize message for each target (processed sequentially)
        // todo-typesafety: replace 'any' parameter with proper message type - violates CLAUDE.md "we hate any"
        const getMessageContent = (msg: any) => {
          if (msg.prompt) return msg.prompt
          if (msg.workDone) return msg.workDone
          return ""
        }

        messagePayload = {
          ...replyMessage,
          prompt: `[Task for ${nextId}]: ${getMessageContent(replyMessage)}`,
          context: `Branched delegation to ${nextId}: ${getMessageContent(replyMessage)}`,
        }
        if (verbose) {
          lgg.log(
            `[queueRun] Branched delegation to ${nextId}: ${messagePayload.prompt.substring(0, 50)}...`
          )
        }
      } else {
        // Single target - use original message
        messagePayload = replyMessage
      }

      const nextMessage = new WorkflowMessage({
        originInvocationId: nodeInvocationId,
        fromNodeId: targetNode.nodeId,
        toNodeId: nextId,
        seq: seq++,
        payload: messagePayload,
        wfInvId: workflowInvocationId,
      })
      messageQueue.push(nextMessage)
      lgg.onlyIf(
        verbose,
        `[queueRun] Added message to queue: ${targetNode.nodeId} -> ${nextId}`
      )
    }
  }

  lgg.onlyIf(verbose, `[queueRun] Message processing loop completed`)

  if (!summaries.length) {
    const error = `[queueRun] no summaries`
    lgg.error(error)
    throw new Error(error)
  }

  lgg.onlyIf(
    verbose,
    `[queueRun] Got ${summaries.length} summaries, ${nodeOutputs.length} outputs`
  )

  // Persist memory updates to database if any nodes updated their memory
  const hasMemoryUpdates = workflow
    .getConfig()
    .nodes.some((n) => n.memory && Object.keys(n.memory).length > 0)
  if (hasMemoryUpdates) {
    try {
      await updateWorkflowMemory({
        workflowVersionId: workflow.getWorkflowVersionId(),
        workflowConfig: workflow.getConfig(),
      })

      lgg.onlyIf(
        verbose,
        chalk.green("[queueRun] Memory updates persisted to database")
      )
    } catch (error) {
      // todo-errorhandling: silently swallowing persistence errors could mask critical failures
      lgg.error(`[queueRun] Failed to persist memory updates: ${error}`)
      // Don't fail the entire run if memory persistence fails
    }
  }

  lgg.onlyIf(
    verbose,
    `[queueRun] Completed successfully for ${workflow.getWorkflowVersionId()}`
  )

  return {
    success: true,
    nodeOutputs,
    totalTime: Date.now() - startTime,
    totalCost: totalCost,
    finalWorkflowOutput: lastNodeOutput,
  }
}

export const evaluateQueueRun = async ({
  workflow,
  queueRunResult,
  evaluation,
  workflowInvocationId,
}: {
  workflow: Workflow
  queueRunResult: QueueRunResult
  evaluation: string
  workflowInvocationId: string
}): Promise<RS<EvaluationResult>> => {
  const evaluationInput = workflow.getEvaluationInput()

  const fitnessResult = await calculateFitness({
    nodeOutputs: queueRunResult.nodeOutputs,
    totalTime: queueRunResult.totalTime,
    totalCost: queueRunResult.totalCost,
    evaluation: evaluation,
    expectedOutputSchema: evaluationInput.expectedOutputSchema,
    finalWorkflowOutput: queueRunResult.finalWorkflowOutput,
  })

  let feedbackResult: RS<string> | null = null
  if (CONFIG.improvement.flags.operatorsWithFeedback) {
    feedbackResult = await calculateFeedback({
      nodeOutputs: queueRunResult.nodeOutputs,
      evaluation: evaluation,
    })
    if (!feedbackResult.success) {
      return R.error(feedbackResult.error, feedbackResult.usdCost)
    }
  }

  if (!fitnessResult.success)
    return R.error(fitnessResult.error, fitnessResult.usdCost)

  const fitness = fitnessResult.data

  await updateWorkflowInvocationInDatabase({
    workflowInvocationId: workflowInvocationId,
    status: "completed",
    end_time: new Date().toISOString(),
    usd_cost: queueRunResult.totalCost + (fitnessResult.usdCost ?? 0),
    // todo-typesafety: unsafe 'as' type assertions - violates CLAUDE.md "we hate as"
    fitness: fitnessResult as unknown as Json,
    extras: {
      evaluation: JSONN.show(evaluation),
      actualOutput: JSONN.show(queueRunResult.nodeOutputs),
    },
    workflow_output: evaluation as unknown as Json,
    expected_output:
      typeof evaluation === "string" ? evaluation : JSON.stringify(evaluation),
    actual_output: queueRunResult.finalWorkflowOutput,
    feedback: feedbackResult?.data ?? "",
    fitness_score: fitness.score,
    novelty: fitness.novelty,
    accuracy: fitness.accuracy,
  })

  return {
    success: true,
    data: {
      transcript: queueRunResult.nodeOutputs,
      summaries: queueRunResult.nodeOutputs.map((output, index) => ({
        timestamp: Date.now(),
        nodeId: `node-${index}`,
        summary: output.outputs[0]?.return?.toString() || "",
        info: { cost: output.totalCost },
      })),
      fitness: fitness,
      feedback: feedbackResult?.data ?? "",
      finalWorkflowOutput: queueRunResult.finalWorkflowOutput,
    },
    usdCost: queueRunResult.totalCost + (fitnessResult.usdCost ?? 0),
  }
}
