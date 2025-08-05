import {
  contextFilePrompt,
  type WorkflowFiles,
} from "@core/tools/context/contextStore.types"
import { isNir } from "@core/utils/common/isNir"
import { lgg } from "@core/utils/logging/Logger"
import { CONFIG } from "@runtime/settings/constants"
import type { CoreMessage } from "ai"
import chalk from "chalk"
import { llmify } from "../../utils/common/llmify"

/**
 * Configuration parameters for building AI chat messages
 */
export interface BuildSimpleMessageContext extends WorkflowFiles {
  /** Primary message content to be sent to the AI model */
  message: string
  /** Optional description of the current workflow node */
  nodeDescription?: string
  /** Optional system-level prompt for AI behavior configuration */
  systemPrompt?: string
  /** Additional contextual information for the message */
  context?: string
  /** Optional node memory for persistent insights */
  nodeMemory?: Record<string, string>
  /** Optional input file URL for evaluation tasks */
  inputFile?: string
  /** Optional evaluation explanation for decision making */
  evalExplanation?: string
  /** Optional expected output format/schema */
  outputType?: any
  /** Whether to log the messages */
  debug?: boolean
}

/**
 * Constructs a properly formatted message array for AI model consumption
 * @param context - Configuration object containing message parameters
 * @returns Array of CoreMessage objects ready for AI processing
 */
export function buildSimpleMessage({
  message,
  nodeDescription,
  context,
  systemPrompt,
  nodeMemory,
  workflowFiles,
  inputFile,
  evalExplanation,
  outputType,
  debug = true,
}: BuildSimpleMessageContext): CoreMessage[] {
  // validate input
  if (!message) {
    throw new Error(
      `Invalid message: missing required fields - message: ${!!message} ${typeof message}, nodeDescription: ${nodeDescription}, context: ${context}`
    )
  }

  // build the chat messages
  const content = [message, context ? `Context: ${context}` : ""].filter(
    Boolean
  )

  // Add workflow_invocation_id to user message if workflowFiles are provided
  if (!isNir(workflowFiles)) {
    content.push("workflow_invocation_id:test-invocation-123")
  }

  let sdkMessages: CoreMessage[] = [
    {
      role: "user",
      content: content.join("\n"),
    },
  ]

  if (systemPrompt) {
    sdkMessages.unshift({
      role: "system",
      content: systemPrompt,
    })
  }

  if (nodeDescription) {
    sdkMessages.unshift({
      role: "system",
      content: `you are the following node: ${nodeDescription}`,
    })
  }

  if (nodeMemory && Object.keys(nodeMemory).length > 0) {
    const memoryContent = `You have the following persistent memory from previous runs:
${JSON.stringify(nodeMemory, null, 2)}

This memory contains durable insights about patterns, preferences, and learnings from past executions.
Use this memory to inform your decisions and responses.`

    sdkMessages.unshift({
      role: "system",
      content: memoryContent,
    })
  }

  if (!isNir(workflowFiles)) {
    const contextContent = contextFilePrompt(
      workflowFiles,
      inputFile,
      evalExplanation,
      outputType
    )

    sdkMessages.unshift({
      role: "system",
      content: contextContent,
    })
  }

  // validate messages before sending to AI
  if (
    !Array.isArray(sdkMessages) ||
    sdkMessages.some((msg) => !msg.role || msg.content === undefined)
  ) {
    throw new Error("Invalid messages format for AI model")
  }

  if (CONFIG.logging.override.InvocationPipeline && debug) {
    lgg.log(chalk.green("sdkMessages:"))
    for (const msg of sdkMessages) {
      const roleColor = msg.role === "system" ? chalk.yellow : chalk.blue
      lgg.log(`${roleColor(`[${msg.role}]`)} ${chalk.gray(msg.content)}`)
    }
  }

  // MERGE SYSTEM MESSAGES INTO ONE

  // merge all system messages into one
  const systemMessages = sdkMessages.filter((msg) => msg.role === "system")
  const systemMessage = systemMessages.map((msg) => msg.content).join("\n")
  sdkMessages.unshift({
    role: "system",
    content: systemMessage,
  })

  // remove all system messages
  sdkMessages = sdkMessages.filter((msg) => msg.role !== "system")

  // add the system message back
  sdkMessages.unshift({
    role: "system",
    content: llmify(systemMessage),
  })

  return sdkMessages
}
