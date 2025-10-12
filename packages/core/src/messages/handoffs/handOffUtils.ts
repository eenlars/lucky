import { getCoreConfig, getDefaultModels, isLoggingEnabled } from "@core/core-config/coreConfig"
import type { Payload } from "@core/messages/MessagePayload"
import type { WorkflowMessage } from "@core/messages/WorkflowMessage"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { llmify } from "@core/utils/common/llmify"
import { lgg } from "@core/utils/logging/Logger"
import { JSONN } from "@lucky/shared"
import { truncate } from "lodash"
import z from "zod"

/** Single place to call the LLM so both modes stay identical. */
export async function callModelHandoff({ prompt, handOffs }: { prompt: string; handOffs: string[] }): Promise<{
  data: z.infer<ReturnType<typeof createHandoffSchema>> | null
  error: string | null
  usdCost: number
}> {
  const systemPrompt = `
  you should choose the best handoff for the next task.
  `

  const { data, error, usdCost } = await sendAI({
    messages: [
      { role: "system", content: llmify(systemPrompt) },
      { role: "user", content: llmify(prompt) },
    ],
    model: getDefaultModels().nano,
    mode: "structured",
    schema: createHandoffSchema(handOffs),
  })

  if (error) {
    lgg.error("callModelHandoff error", JSONN.show(error))
    return {
      data: null,
      error,
      usdCost: usdCost ?? 0,
    }
  }

  return {
    data,
    error,
    usdCost: usdCost ?? 0,
  }
}

/** Converts the raw model response into the common `HandoffResult`. */
export function buildResultHandoff({
  data,
  success,
  error,
  usdCost,
  replyMessage,
  content,
  workflowMessage: _workflowMessage,
}: {
  data: {
    handoff: string
    reason: string
    error?: string | null
    hasError: boolean
    handoffContext: string
  } | null
  success: boolean
  error: string | undefined
  usdCost: number | undefined
  replyMessage: Payload
  content: string
  workflowMessage: WorkflowMessage
}): HandoffResult {
  if (!success) throw new Error(error)

  // Handle null or undefined data
  if (!data) {
    lgg.error("buildResultHandoff: data is null or undefined, returning error")
    return {
      handoff: "end",
      usdCost: usdCost ?? 0,
      replyMessage: {
        kind: "result",
        berichten: [{ type: "text", text: "No handoff data received from model" }],
      },
    }
  }

  // Handle missing handoff property
  if (!data.handoff) {
    lgg.error("buildResultHandoff: data.handoff is null or undefined, returning error")
    return {
      handoff: "end",
      usdCost: usdCost ?? 0,
      replyMessage: {
        kind: "result",
        berichten: [{ type: "text", text: "Invalid handoff response from model" }],
      },
    }
  }

  lgg.onlyIf(isLoggingEnabled("Messaging"), `handoff: ${JSONN.show(data.reason)}`)

  // End workflow on “end”
  if (data.handoff === "end") {
    return {
      handoff: data.handoff,
      usdCost: usdCost ?? 0,
      replyMessage: {
        kind: "result",
        berichten: [{ type: "text", text: content }],
      },
    }
  }

  // Model-detected error
  if (data.error) {
    return {
      handoff: "end",
      usdCost: usdCost ?? 0,
      replyMessage: {
        kind: "result",
        berichten: [
          {
            type: "text",
            text: truncate(String(data.error), { length: 1000 }),
          },
        ],
      },
    }
  }

  return { handoff: data.handoff, usdCost: usdCost ?? 0, replyMessage }
}

export const createHandoffSchema = (handOffs: string[]) =>
  z.object({
    handoff: z.enum([...handOffs] as [string, ...string[]]),
    reason: z.string().describe("reason for handoff, max 1 short sentence."),
    error: z.string().nullish(),
    hasError: z.boolean().describe("iff you think this input was an error return true"),
    handoffContext: z.string().describe("what should the other node have to know? (plain english)"),
  })

/**
 * Result of choosing a handoff target along with reply payload and cost.
 */
export interface HandoffResult {
  handoff: string
  usdCost: number
  replyMessage: Payload
}

export const handoffPrompts = {
  end: `
  if you are done with your task to complete the workflow, return 'end'. 
  if you are not done, return the name of the node to complete their part of the workflow.
  `,
}
