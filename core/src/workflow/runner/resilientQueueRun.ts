import type {
  AggregatedPayload,
  MessageType,
} from "@core/messages/MessagePayload"
import type { AgentSteps } from "@core/messages/pipeline/AgentStep.types"
import type { InvocationSummary } from "@core/messages/summaries"
import { WorkflowMessage } from "@core/messages/WorkflowMessage"
import type { ToolExecutionContext } from "@core/tools/toolFactory"
import type { Json } from "@core/utils/clients/supabase/types"
import { lgg } from "@core/utils/logging/Logger"
import { updateWorkflowInvocationInDatabase } from "@core/utils/persistence/workflow/registerWorkflow"
import { updateWorkflowMemory } from "@core/utils/persistence/workflow/updateNodeMemory"
import { R, type RS } from "@core/utils/types"
import { getNodeRole } from "@core/utils/validation/workflow/verifyHierarchical"
import { calculateFeedback } from "@core/workflow/actions/analyze/calculate-fitness/calculateFeedback"
import { calculateFitness } from "@core/workflow/actions/analyze/calculate-fitness/calculateFitness"
import type { FitnessOfWorkflow } from "@core/workflow/actions/analyze/calculate-fitness/fitness.types"
import type { Workflow } from "@core/workflow/Workflow"
import { CONFIG } from "@runtime/settings/constants"
import { JSONN } from "@shared/utils/files/json/jsonParse"
import chalk from "chalk"
import { isNir } from "../../utils/common/isNir"

// import resilience framework
import {
  createCheckpointData,
  HealthMonitor,
  ResilientExecutor,
  ResilientExecutorFactory,
  startHealthMonitoring,
  WorkflowCheckpoint,
  type CheckpointData,
} from "@core/resilience"

export type QueueRunParams = {
  workflow: Workflow
  workflowInput: string
  workflowInvocationId: string
  resumeFromCheckpoint?: boolean
  enableCheckpointing?: boolean
  enableHealthMonitoring?: boolean
}

export type QueueRunResult = {
  success: boolean
  agentSteps: AgentSteps
  finalWorkflowOutput: string
  error?: string
  totalTime: number
  totalCost: number
  checkpointUsed?: boolean
  nodeFailures?: Map<string, number>
}

export type EvaluationResult = {
  transcript: AgentSteps
  summaries: InvocationSummary[]
  fitness: FitnessOfWorkflow
  feedback: string
  finalWorkflowOutput: string
}

const coordinationType = CONFIG.coordinationType
const verbose = CONFIG.logging.override.Memory ?? false

// dead letter queue for failed messages
class DeadLetterQueue {
  private messages: Array<{
    message: WorkflowMessage
    error: Error
    timestamp: number
    retryCount: number
  }> = []

  add(message: WorkflowMessage, error: Error, retryCount: number): void {
    this.messages.push({
      message,
      error,
      timestamp: Date.now(),
      retryCount,
    })

    lgg.warn(
      `[DeadLetterQueue] Added message to DLQ: ${message.fromNodeId} -> ${message.toNodeId}, error: ${error.message}`
    )
  }

  getMessages() {
    return this.messages
  }

  size(): number {
    return this.messages.length
  }
}

export async function resilientQueueRun({
  workflow,
  workflowInput,
  workflowInvocationId,
  resumeFromCheckpoint = false,
  enableCheckpointing = true,
  enableHealthMonitoring = true,
}: QueueRunParams): Promise<QueueRunResult> {
  lgg.log(
    `[resilientQueueRun] Starting for workflow ${workflow.getWorkflowVersionId()}, invocation ${workflowInvocationId}`
  )

  // initialize resilience components
  const checkpoint = new WorkflowCheckpoint(workflowInvocationId)
  const deadLetterQueue = new DeadLetterQueue()
  const nodeFailures = new Map<string, number>()
  const healthMonitor = new HealthMonitor()

  // register health checks for critical components
  if (enableHealthMonitoring) {
    registerHealthChecks(workflow, healthMonitor)
    startHealthMonitoring()
  }

  let checkpointData: CheckpointData | null = null
  let checkpointUsed = false

  // attempt to resume from checkpoint if requested
  if (resumeFromCheckpoint && enableCheckpointing) {
    checkpointData = await checkpoint.load()
    if (checkpointData) {
      lgg.info(
        `[resilientQueueRun] Resuming from checkpoint at ${new Date(checkpointData.timestamp).toISOString()}`
      )
      checkpointUsed = true
    }
  }

  // initialize state from checkpoint or fresh
  const entryNodeId = workflow.getEntryNodeId()
  const nodes = workflow.getNodes()
  const nodeMap = new Map(nodes.map((node) => [node.nodeId, node]))

  let agentSteps: AgentSteps = checkpointData?.agentSteps ?? []
  let seq = checkpointData
    ? Math.max(...checkpointData.messageQueue.map((m) => m.seq)) + 1
    : 0
  let totalCost = checkpointData?.totalCost ?? 0
  let nodeInvocations = checkpointData?.nodeInvocations ?? 0
  const summaries: InvocationSummary[] = checkpointData?.summaries ?? []
  const startTime = Date.now()
  const maxNodeInvocations = CONFIG.workflow.maxNodeInvocations
  let lastNodeOutput = checkpointData?.lastNodeOutput ?? ""
  const completedNodes = checkpointData?.completedNodes ?? new Set<string>()
  const nodeMemoryUpdates =
    checkpointData?.nodeMemoryUpdates ??
    new Map<string, Record<string, string>>()

  // message queue to process
  const messageQueue: WorkflowMessage[] = checkpointData?.messageQueue ?? []

  // aggregation storage for nodes with waitingFor
  const waitingMessages =
    checkpointData?.waitingMessages ?? new Map<string, WorkflowMessage[]>()

  const messageType: MessageType =
    coordinationType === "sequential" ? "sequential" : "delegation"

  // add initial message if not resuming
  if (!checkpointData) {
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
  }

  // create resilient executors for each node
  const nodeExecutors = new Map<string, ResilientExecutor>()
  nodes.forEach((node) => {
    const handOffs = isNir(node.toConfig().handOffs)
      ? ["end"]
      : node.toConfig().handOffs
    const executor = ResilientExecutorFactory.forWorkflowNode(
      node.nodeId,
      async () => {
        // fallback: skip this node and continue
        lgg.warn(`[resilientQueueRun] Using fallback for node ${node.nodeId}`)
        return {
          nodeInvocationFinalOutput: `Node ${node.nodeId} skipped due to failures`,
          usdCost: 0,
          nodeInvocationId: `fallback-${Date.now()}`,
          replyMessage: {
            kind: "error",
            message: "Node execution failed, using fallback",
          },
          nextIds: handOffs,
          outgoingMessages: [],
          error: new Error("Fallback used"),
          summaryWithInfo: {
            timestamp: Date.now(),
            nodeId: node.nodeId,
            summary: "Node skipped due to failures",
          },
          updatedMemory: null,
          agentSteps: [],
        }
      }
    )
    nodeExecutors.set(node.nodeId, executor)
  })

  // start auto-checkpoint if enabled
  if (enableCheckpointing) {
    checkpoint.startAutoCheckpoint(() =>
      createCheckpointData(
        workflow,
        workflowInvocationId,
        messageQueue,
        completedNodes,
        nodeInvocations,
        agentSteps,
        summaries,
        totalCost,
        lastNodeOutput,
        waitingMessages,
        nodeMemoryUpdates
      )
    )
  }

  // process messages until queue is empty
  while (messageQueue.length > 0) {
    let currentMessage = messageQueue.shift()!
    lgg.onlyIf(
      verbose,
      `[resilientQueueRun] Processing message to node ${currentMessage.toNodeId}`
    )

    // check max node invocations limit
    if (nodeInvocations >= maxNodeInvocations) {
      lgg.warn(
        `[resilientQueueRun] Max node invocations reached: ${maxNodeInvocations}`
      )
      break
    }

    // handle 'end' node as a special case
    if (currentMessage.toNodeId === "end") {
      lgg.onlyIf(verbose, `[resilientQueueRun] Reached end node, continuing`)
      continue
    }

    const targetNode = nodeMap.get(currentMessage.toNodeId)

    if (!targetNode) {
      const error = new Error(
        `Target workflow node ${currentMessage.toNodeId} not found`
      )
      lgg.error(`[resilientQueueRun] ${error.message}`)
      deadLetterQueue.add(currentMessage, error, 0)
      continue
    }

    // skip if node already completed (for idempotency)
    if (completedNodes.has(currentMessage.toNodeId)) {
      lgg.info(
        `[resilientQueueRun] Skipping already completed node ${currentMessage.toNodeId}`
      )
      continue
    }

    // check if this node is waiting for multiple messages
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
        // still waiting for more messages, continue to next message
        continue
      }

      // all messages received, create aggregated message
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

      // create new aggregated message
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

      // clean up waiting state
      waitingMessages.delete(waitingKey)
    }

    // validate hierarchical message flow if coordination type is hierarchical
    if (coordinationType === "hierarchical") {
      const workflowConfig = workflow.getConfig()
      const fromNodeRole = getNodeRole(
        currentMessage.fromNodeId,
        workflowConfig
      )
      const toNodeRole = getNodeRole(currentMessage.toNodeId, workflowConfig)

      // validate hierarchical constraints
      if (fromNodeRole === "worker" && toNodeRole === "worker") {
        const error = new Error(
          `Invalid hierarchical flow: Worker '${currentMessage.fromNodeId}' cannot send message to worker '${currentMessage.toNodeId}'. ` +
            `Workers can only communicate with the orchestrator or 'end'.`
        )
        deadLetterQueue.add(currentMessage, error, 0)
        continue
      }

      // additional validation for delegation messages
      if (
        currentMessage.payload.kind === "delegation" &&
        fromNodeRole !== "orchestrator" &&
        currentMessage.fromNodeId !== "start"
      ) {
        const error = new Error(
          `Invalid hierarchical flow: Only the orchestrator can send delegation messages. ` +
            `Node '${currentMessage.fromNodeId}' (role: ${fromNodeRole}) attempted to delegate.`
        )
        deadLetterQueue.add(currentMessage, error, 0)
        continue
      }
    }

    const toolContext: ToolExecutionContext =
      workflow.getToolExecutionContext(workflowInvocationId)

    // execute node invocation with resilience
    const executor = nodeExecutors.get(targetNode.nodeId)!
    const result = await executor.execute(async () => {
      const invocationResult = await targetNode.invoke({
        workflowMessageIncoming: currentMessage,
        workflowConfig: workflow.getConfig(),
        ...toolContext,
      })

      if (invocationResult.error) {
        throw invocationResult.error
      }

      return invocationResult
    })

    if (result.success) {
      const invocationResult = result.data!

      lastNodeOutput = invocationResult.nodeInvocationFinalOutput
      nodeInvocations++
      completedNodes.add(targetNode.nodeId)

      currentMessage.updateMessage({
        target_invocation_id: invocationResult.nodeInvocationId,
      })

      totalCost += invocationResult.usdCost
      summaries.push(invocationResult.summaryWithInfo)

      // store memory updates
      if (invocationResult.updatedMemory) {
        nodeMemoryUpdates.set(targetNode.nodeId, invocationResult.updatedMemory)

        // update the node's memory in the workflow config
        const nodeConfig = workflow
          .getConfig()
          .nodes.find((n) => n.nodeId === targetNode.nodeId)
        if (nodeConfig) {
          nodeConfig.memory = invocationResult.updatedMemory
        }
      }

      // check if this is a terminal node
      const isTerminalNode = invocationResult.nextIds.includes("end")

      lgg.onlyIf(
        verbose,
        `[resilientQueueRun] Node ${targetNode.nodeId} completed successfully, nextIds: [${invocationResult.nextIds.join(", ")}], isTerminal: ${isTerminalNode}`
      )

      // add next messages to the queue
      if (
        invocationResult.outgoingMessages &&
        invocationResult.outgoingMessages.length > 0
      ) {
        for (const om of invocationResult.outgoingMessages) {
          const nextMessage = new WorkflowMessage({
            originInvocationId: invocationResult.nodeInvocationId,
            fromNodeId: targetNode.nodeId,
            toNodeId: om.toNodeId,
            seq: seq++,
            payload: om.payload,
            wfInvId: workflowInvocationId,
          })
          messageQueue.push(nextMessage)
        }
      } else {
        for (const nextId of invocationResult.nextIds) {
          const messagePayload = invocationResult.error
            ? {
                kind: "error",
                message: invocationResult.error.message,
                stack: invocationResult.error.stack,
              }
            : invocationResult.replyMessage

          const nextMessage = new WorkflowMessage({
            originInvocationId: invocationResult.nodeInvocationId,
            fromNodeId: targetNode.nodeId,
            toNodeId: nextId,
            seq: seq++,
            payload: messagePayload,
            wfInvId: workflowInvocationId,
          })
          messageQueue.push(nextMessage)
        }
      }

      // clear failure count on success
      nodeFailures.delete(targetNode.nodeId)
    } else {
      // handle failure
      const failureCount = (nodeFailures.get(targetNode.nodeId) ?? 0) + 1
      nodeFailures.set(targetNode.nodeId, failureCount)

      lgg.error(
        `[resilientQueueRun] Node ${targetNode.nodeId} failed (attempt ${failureCount}): ${result.error?.message}`
      )

      if (result.fallbackUsed) {
        lgg.info(
          `[resilientQueueRun] Fallback used for node ${targetNode.nodeId}`
        )
        completedNodes.add(targetNode.nodeId)
      } else {
        // add to dead letter queue after max retries
        deadLetterQueue.add(currentMessage, result.error!, failureCount)
      }
    }

    // save checkpoint after each node execution
    if (enableCheckpointing && nodeInvocations % 5 === 0) {
      await checkpoint.save(
        createCheckpointData(
          workflow,
          workflowInvocationId,
          messageQueue,
          completedNodes,
          nodeInvocations,
          agentSteps,
          summaries,
          totalCost,
          lastNodeOutput,
          waitingMessages,
          nodeMemoryUpdates
        )
      )
    }
  }

  // stop auto-checkpoint
  if (enableCheckpointing) {
    checkpoint.stopAutoCheckpoint()
  }

  lgg.onlyIf(verbose, `[resilientQueueRun] Message processing loop completed`)

  if (deadLetterQueue.size() > 0) {
    lgg.warn(
      `[resilientQueueRun] ${deadLetterQueue.size()} messages in dead letter queue`
    )
  }

  if (!summaries.length) {
    const error = `[resilientQueueRun] no summaries`
    lgg.error(error)
    throw new Error(error)
  }

  // persist memory updates with resilience
  const memoryExecutor = ResilientExecutorFactory.forDatabase("workflow-memory")
  if (nodeMemoryUpdates.size > 0) {
    const memoryResult = await memoryExecutor.execute(async () => {
      await updateWorkflowMemory({
        workflowVersionId: workflow.getWorkflowVersionId(),
        workflowConfig: workflow.getConfig(),
      })
    })

    if (memoryResult.success) {
      lgg.onlyIf(
        verbose,
        chalk.green("[resilientQueueRun] Memory updates persisted to database")
      )
    } else {
      lgg.error(
        `[resilientQueueRun] Failed to persist memory updates: ${memoryResult.error?.message}`
      )
    }
  }

  // final checkpoint
  if (enableCheckpointing) {
    await checkpoint.save(
      createCheckpointData(
        workflow,
        workflowInvocationId,
        messageQueue,
        completedNodes,
        nodeInvocations,
        agentSteps,
        summaries,
        totalCost,
        lastNodeOutput,
        waitingMessages,
        nodeMemoryUpdates
      )
    )
  }

  lgg.onlyIf(
    verbose,
    `[resilientQueueRun] Completed successfully for ${workflow.getWorkflowVersionId()}`
  )

  return {
    success: true,
    agentSteps,
    totalTime: Date.now() - startTime,
    totalCost: totalCost,
    finalWorkflowOutput: lastNodeOutput,
    checkpointUsed,
    nodeFailures: nodeFailures.size > 0 ? nodeFailures : undefined,
  }
}

function registerHealthChecks(
  workflow: Workflow,
  monitor: HealthMonitor
): void {
  // register health check for each node
  workflow.getNodes().forEach((node) => {
    monitor.registerComponent(`node-${node.nodeId}`, async () => {
      // simple health check - could be enhanced
      return {
        success: true,
        metadata: {
          nodeId: node.nodeId,
          toolCount:
            node.toConfig().codeTools.length + node.toConfig().mcpTools.length,
        },
      }
    })
  })

  // register workflow-level health check
  monitor.registerComponent("workflow", async () => {
    const nodes = workflow.getNodes()
    // validate workflow configuration using existing validator
    const { verifyWorkflowConfig } = await import(
      "@core/utils/validation/workflow"
    )
    const validationResult = await verifyWorkflowConfig(workflow.toConfig(), {
      throwOnError: false,
      verbose: false,
    })

    return {
      success: validationResult.isValid,
      message: validationResult.errors?.join("; ") || undefined,
      metadata: {
        nodeCount: nodes.length,
        workflowId: workflow.getWorkflowVersionId(),
      },
    }
  })
}

export const evaluateResilientQueueRun = async ({
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
    agentSteps: queueRunResult.agentSteps,
    totalTime: queueRunResult.totalTime,
    totalCost: queueRunResult.totalCost,
    evaluation: evaluation,
    outputSchema: evaluationInput.outputSchema,
    finalWorkflowOutput: queueRunResult.finalWorkflowOutput,
  })

  let feedbackResult: RS<string> | null = null
  if (CONFIG.improvement.flags.operatorsWithFeedback) {
    feedbackResult = await calculateFeedback({
      agentSteps: queueRunResult.agentSteps,
      evaluation: evaluation,
    })
    if (!feedbackResult.success) {
      return R.error(feedbackResult.error, feedbackResult.usdCost)
    }
  }

  if (!fitnessResult.success)
    return R.error(fitnessResult.error, fitnessResult.usdCost)

  const fitness = fitnessResult.data

  // use resilient executor for database update
  const dbExecutor = ResilientExecutorFactory.forDatabase(
    "workflow-invocation-update"
  )
  await dbExecutor.execute(async () => {
    await updateWorkflowInvocationInDatabase({
      workflowInvocationId: workflowInvocationId,
      status: "completed",
      end_time: new Date().toISOString(),
      usd_cost: queueRunResult.totalCost + (fitnessResult.usdCost ?? 0),
      fitness: fitnessResult as unknown as Json,
      extras: {
        evaluation: JSONN.show(evaluation),
        actualOutput: JSONN.show(queueRunResult.agentSteps),
        checkpointUsed: queueRunResult.checkpointUsed,
        nodeFailures: queueRunResult.nodeFailures
          ? Array.from(queueRunResult.nodeFailures.entries())
          : undefined,
      },
      workflow_output: evaluation as unknown as Json,
      expected_output:
        typeof evaluation === "string"
          ? evaluation
          : JSON.stringify(evaluation),
      actual_output: queueRunResult.finalWorkflowOutput,
      feedback: feedbackResult?.data ?? "",
      fitness_score: fitness.score,
      novelty: fitness.novelty,
      accuracy: fitness.accuracy,
    })
  })

  return {
    success: true,
    data: {
      transcript: queueRunResult.agentSteps,
      summaries: queueRunResult.agentSteps.map((output, index) => ({
        timestamp: Date.now(),
        nodeId: `node-${index}`,
        summary: output.return?.toString() || "",
      })),
      fitness: fitness,
      feedback: feedbackResult?.data ?? "",
      finalWorkflowOutput: queueRunResult.finalWorkflowOutput,
    },
    usdCost: queueRunResult.totalCost + (fitnessResult.usdCost ?? 0),
  }
}
