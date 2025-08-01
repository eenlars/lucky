import {
  buildSimpleMessage,
  type BuildSimpleMessageContext,
} from "@/core/messages/create/buildSimpleMessage"
import {
  isDelegationPayload,
  isSequentialPayload,
  type AggregatedPayload,
} from "@/core/messages/MessagePayload"
import type { WorkflowMessage } from "@/core/messages/WorkflowMessage"
import { agentSystemPrompt } from "@/core/prompts/standardPrompt"
import type { WorkflowFiles } from "@/core/tools/context/contextStore.types"
import type { CoreMessage } from "ai"

export interface BuildMessagesContext extends WorkflowFiles {
  workflowMessageIncoming: WorkflowMessage
  workflowInvocationId: string
  handOffs: string
  nodeDescription: string
  nodeSystemPrompt: string
  nodeMemory?: Record<string, string>
  inputFile?: string
  evalExplanation?: string
  outputType?: any
  mainWorkflowGoal: string
}

export function buildMessages({
  workflowMessageIncoming,
  handOffs,
  nodeDescription,
  nodeSystemPrompt,
  nodeMemory,
  workflowFiles,
  inputFile,
  evalExplanation,
  outputType,
  mainWorkflowGoal,
}: BuildMessagesContext): CoreMessage[] {
  const { payload } = workflowMessageIncoming

  // Only delegation or any payloads carry context
  const payloadContext =
    (isDelegationPayload(payload) || isSequentialPayload(payload)) &&
    payload.context
      ? payload.context +
        " | you are a part of a larger system trying to solve: " +
        mainWorkflowGoal
      : ""

  // Shared params for every buildSimpleMessage call
  const baseParams: BuildSimpleMessageContext = {
    message: "",
    nodeDescription,
    systemPrompt: nodeSystemPrompt,
    context: payloadContext,
    nodeMemory,
    workflowFiles,
    inputFile,
    evalExplanation,
    outputType,
  }

  let message: string
  let context: string
  const systemPrompt: string = nodeSystemPrompt + agentSystemPrompt

  switch (payload.kind) {
    case "delegation":
      message = payload.prompt
      context = `${payloadContext} | another node has asked you to do this work. You will do the work and hand it off to ${handOffs}`
      break

    case "sequential":
      message = payload.prompt
      context = payloadContext
      break

    case "error":
      message = `Handle error and continue: ${payload.message}`
      context = `Previous error: ${payload.message} | ${payloadContext}`
      break

    case "result":
      message = `Hey you just asked me to do this work: ${payload.workDone}`
      context = payloadContext
      break

    case "control":
      message = `Handle control signal: ${payload.flag}`
      context = payloadContext
      break

    case "aggregated":
      const aggregatedPayload = payload as AggregatedPayload
      message = `You are receiving aggregated results from ${aggregatedPayload.messages.length} workers. Process and combine these results:\n\n${aggregatedPayload.messages.map((msg, i) => `Worker ${i + 1} (${msg.fromNodeId}):\n${JSON.stringify(msg.payload, null, 2)}`).join("\n\n")}`
      context = `${payloadContext} | Aggregated results from multiple workers`
      break

    default:
      throw new Error(`Unsupported payload type: ${payload.kind}`)
  }

  return buildSimpleMessage({
    ...baseParams,
    message,
    context,
    systemPrompt,
  })
}
