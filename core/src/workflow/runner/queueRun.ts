// src/core/workflow/queueRun.ts

import type {
  AggregatedPayload,
  MessageType,
} from "@core/messages/MessagePayload"
import type { AgentSteps } from "@core/messages/pipeline/AgentStep.types"
import type { InvocationSummary } from "@core/messages/summaries"
import { WorkflowMessage } from "@core/messages/WorkflowMessage"
import type { ToolExecutionContext } from "@core/tools/toolFactory"
import { lgg } from "@core/utils/logging/Logger"
import { updateWorkflowMemory } from "@core/utils/persistence/workflow/updateNodeMemory"
import { getNodeRole } from "@core/utils/validation/workflow/verifyHierarchical"
import { CONFIG } from "@runtime/settings/constants"
import chalk from "chalk"
import type { QueueRunParams, QueueRunResult } from "./types"

// Types are centralized in ./types to avoid circular imports and keep the API surface stable.

/**
 * Core workflow execution engine using a message queue-based approach.
 *
 * ## Runtime Architecture
 *
 * This module implements the heart of workflow execution through an event-driven
 * message queue system. Workflows are directed acyclic graphs (DAGs) where nodes
 * communicate by passing messages.
 *
 * ## Execution Flow
 *
 * 1. **Initialization**: Creates initial message from workflow input to entry node
 * 2. **Queue Processing**: Processes messages sequentially from the queue
 * 3. **Node Invocation**: Each message triggers target node execution
 * 4. **Message Routing**: Nodes produce new messages for downstream nodes
 * 5. **Termination**: Execution ends when queue is empty or "end" node is reached
 *
 * ## Message Aggregation
 *
 * Nodes can wait for multiple upstream messages before executing using `waitingFor`.
 * This enables fan-in patterns where a node processes results from multiple sources.
 * Messages are collected until all required inputs arrive, then aggregated into
 * a single message with all payloads.
 *
 * ## Coordination Modes
 *
 * - **Sequential**: Flexible routing where any node can message any other node
 * - **Hierarchical**: Enforces orchestrator-worker patterns with validation rules:
 *   - Workers cannot message other workers directly
 *   - Only orchestrators can send delegation messages
 *   - Workers communicate through the orchestrator
 *
 * ## Memory Persistence
 *
 * Terminal nodes (those routing to "end") trigger memory persistence. Updated
 * memory from node execution is saved back to the workflow configuration and
 * optionally persisted to the database for learning across invocations.
 *
 * ## Error Handling
 *
 * - Node invocation errors are captured but don't halt execution
 * - Error messages are propagated downstream as error payloads
 * - Max invocation limits prevent infinite loops
 * - Memory persistence failures are logged but don't fail the run
 *
 * ## Performance Considerations
 *
 * - Sequential message processing ensures deterministic execution
 * - Message aggregation minimizes redundant node invocations
 * - Configurable max node invocations (default: 50) prevents runaway execution
 * - Memory updates are batched and persisted at workflow completion
 */

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

  // validate entry point exists - workflows must have a designated starting node
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

  // runtime state tracking
  const agentSteps: AgentSteps = []
  let seq = 0 // message sequence counter for ordering
  let totalCost = 0
  // track invocations per node and globally
  const perNodeInvocationCounts = new Map<string, number>()
  let totalNodeInvocationsCount = 0
  const maxTotalNodeInvocations = CONFIG.workflow.maxTotalNodeInvocations
  const maxPerNodeInvocations =
    CONFIG.workflow.maxPerNodeInvocations ??
    CONFIG.workflow.maxTotalNodeInvocations
  const summaries: InvocationSummary[] = []
  const startTime = Date.now()
  let lastNodeOutput = "" // tracks final output for workflow result

  // message queue to process - FIFO queue ensures deterministic execution order
  const messageQueue: WorkflowMessage[] = []

  // aggregation storage for nodes with waitingFor - collects messages until all dependencies arrive
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
      berichten: [
        {
          type: "text",
          text: workflowInput.replace(/\n/g, " ").replace(/\s+/g, " "),
        },
      ],
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

    // Check global and per-node max invocations limits
    if (totalNodeInvocationsCount >= maxTotalNodeInvocations) {
      lgg.warn(
        `[queueRun] Max node invocations reached: ${maxTotalNodeInvocations}`
      )
      break
    }

    // Check per-node max invocations limit
    const toNodeId = currentMessage.toNodeId
    const currentCount = perNodeInvocationCounts.get(toNodeId) ?? 0
    if (currentCount >= maxPerNodeInvocations) {
      lgg.warn(
        `[queueRun] Max node invocations reached for ${toNodeId}: ${maxPerNodeInvocations}`
      )
      // skip invoking this node; continue processing other messages
      continue
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

    // check if this node is waiting for multiple messages (fan-in pattern)
    const nodeConfig = workflow
      .getConfig()
      .nodes.find((n) => n.nodeId === currentMessage.toNodeId)
    const waitingFor = nodeConfig?.waitingFor || nodeConfig?.waitFor

    if (waitingFor && waitingFor.length > 0) {
      // add message to waiting collection
      const waitingKey = currentMessage.toNodeId
      if (!waitingMessages.has(waitingKey)) {
        waitingMessages.set(waitingKey, [])
      }
      waitingMessages.get(waitingKey)!.push(currentMessage)

      // check if all required messages are received
      const receivedMessages = waitingMessages.get(waitingKey)!
      const receivedFromNodes = new Set(
        receivedMessages.map((m) => m.fromNodeId)
      )
      const allReceived = waitingFor.every((nodeId) =>
        receivedFromNodes.has(nodeId)
      )

      if (!allReceived) {
        // still waiting for more messages, skip this node for now
        continue
      }

      // all messages received, create aggregated message containing all payloads
      const aggregatedPayload: AggregatedPayload = {
        kind: "aggregated",
        berichten: [
          {
            type: "text",
            text: "Just aggregating messages.",
          },
        ],
        messages: receivedMessages.map((msg) => ({
          fromNodeId: msg.fromNodeId,
          payload: msg.payload,
        })),
      }

      // create new aggregated message to replace individual messages
      const aggregatedMessage = new WorkflowMessage({
        originInvocationId: currentMessage.originInvocationId,
        fromNodeId: "aggregator",
        toNodeId: currentMessage.toNodeId,
        seq: currentMessage.seq,
        payload: aggregatedPayload,
        wfInvId: currentMessage.wfInvId,
      })

      // replace current message with aggregated one
      currentMessage = aggregatedMessage

      // clean up waiting state now that aggregation is complete
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
      outgoingMessages,
      error,
      summaryWithInfo,
      updatedMemory,
      agentSteps: nodeAgentSteps,
    } = await targetNode.invoke({
      workflowMessageIncoming: currentMessage,
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
        `[queueRun] Node invocation error for ${targetNode.nodeId}`,
        error
      )
    }

    // increment per-node and global invocation counts after invocation (even on error)
    perNodeInvocationCounts.set(
      targetNode.nodeId,
      (perNodeInvocationCounts.get(targetNode.nodeId) ?? 0) + 1
    )
    totalNodeInvocationsCount++

    // Aggregate agent steps from this node invocation into the run-level transcript
    if (Array.isArray(nodeAgentSteps) && nodeAgentSteps.length > 0) {
      agentSteps.push(...nodeAgentSteps)
    }

    currentMessage.updateMessage({
      target_invocation_id: nodeInvocationId,
    })

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

    // route messages to next nodes based on handoff decisions
    if (outgoingMessages && outgoingMessages.length > 0) {
      // node provided specific messages for each target - use these exact payloads
      for (const om of outgoingMessages) {
        const nextMessage = new WorkflowMessage({
          originInvocationId: nodeInvocationId,
          fromNodeId: targetNode.nodeId,
          toNodeId: om.toNodeId,
          seq: seq++,
          payload: om.payload,
          wfInvId: workflowInvocationId,
        })
        messageQueue.push(nextMessage)
        lgg.onlyIf(
          verbose,
          `[queueRun] Added message to queue (handler): ${targetNode.nodeId} -> ${om.toNodeId}`
        )
      }
    } else {
      // generate messages for each target node based on handoff IDs
      for (const nextId of nextIds) {
        // create per-target customized messages for parallel processing
        // todo-typesafety: replace 'any' with proper payload type - violates CLAUDE.md "we hate any"
        let messagePayload: any
        if (error) {
          // propagate error to downstream nodes
          messagePayload = {
            kind: "error",
            message: error.message,
            stack: error.stack,
          }
        } else if (nextIds.length > 1 && !nextIds.includes("end")) {
          // branched processing - customize message for each target
          // this enables parallel task delegation with context-specific instructions
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
          // single target - use original message without modification
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
  }

  lgg.onlyIf(verbose, `[queueRun] Message processing loop completed`)

  if (!summaries.length) {
    const error = `[queueRun] no summaries`
    lgg.error(error)
    throw new Error(error)
  }

  lgg.onlyIf(
    verbose,
    `[queueRun] Got ${summaries.length} summaries, ${agentSteps.length} outputs`
  )

  // persist memory updates to database if any nodes updated their memory
  // this enables learning across workflow invocations
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
      // don't fail the entire run if memory persistence fails
      // this ensures workflow completes even if learning can't be saved
    }
  }

  lgg.onlyIf(
    verbose,
    `[queueRun] Completed successfully for ${workflow.getWorkflowVersionId()}`
  )

  return {
    success: true,
    agentSteps,
    totalTime: Date.now() - startTime,
    totalCost: totalCost,
    finalWorkflowOutput: lastNodeOutput,
  }
}
