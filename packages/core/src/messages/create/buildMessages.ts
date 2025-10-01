import { buildSimpleMessage, type BuildSimpleMessageContext } from "@core/messages/create/buildSimpleMessage"
import { extractTextFromPayload, type AggregatedPayload } from "@core/messages/MessagePayload"
import type { WorkflowMessage } from "@core/messages/WorkflowMessage"
import { agentSystemPrompt } from "@core/prompts/standardPrompt"
import type { WorkflowFiles } from "@core/tools/context/contextStore.types"
import type { NodeMemory } from "@core/utils/memory/memorySchema"
import type { ModelMessage } from "ai"

/**
 * Parameters for composing a complete message set for model consumption.
 */
export interface BuildMessagesContext extends WorkflowFiles {
  workflowMessageIncoming: WorkflowMessage
  workflowInvocationId: string
  handOffs: string
  nodeDescription: string
  nodeSystemPrompt: string
  nodeMemory?: NodeMemory
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
}: BuildMessagesContext): ModelMessage[] {
  const { payload } = workflowMessageIncoming

  // Shared params for every buildSimpleMessage call
  const baseParams: BuildSimpleMessageContext = {
    message: "",
    nodeDescription,
    systemPrompt: nodeSystemPrompt,
    context: "",
    nodeMemory,
    workflowFiles,
    inputFile,
    evalExplanation,
    outputType,
  }

  let context: string = ""
  const systemPrompt: string = nodeSystemPrompt + agentSystemPrompt

  let message = extractTextFromPayload(payload)

  switch (payload.kind) {
    case "delegation":
      context = `another node has asked you to do this work. You will do the work and hand it off to ${handOffs}`
      break

    case "sequential":
      break

    case "result":
      message = `Hey you just asked me to do this work: ${message}`
      break

    case "aggregated":
      const aggregatedPayload = payload as AggregatedPayload
      message = `You are receiving aggregated results from ${aggregatedPayload.messages.length} workers. Process and combine these results:\n\n${aggregatedPayload.messages.map((msg, i) => `Worker ${i + 1} (${msg.fromNodeId}):\n${JSON.stringify(msg.payload, null, 2)}`).join("\n\n")}`
      context = `Aggregated results from multiple workers`
      break

    default: {
      throw new Error(
        `Unsupported payload type: ${
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (payload as any)?.kind ?? "unknown"
        }`,
      )
    }
  }

  return buildSimpleMessage({
    ...baseParams,
    message,
    context,
    systemPrompt,
  })
}
