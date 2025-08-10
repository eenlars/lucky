import type { HandoffResult } from "@core/messages/handoffs/handOffUtils"
import {
  buildResultHandoff,
  callModelHandoff,
  handoffPrompts,
} from "@core/messages/handoffs/handOffUtils"
import type { ChooseHandoffOpts } from "@core/messages/handoffs/main"
import type { Payload } from "@core/messages/MessagePayload"
import { toolUsageToString } from "@core/messages/pipeline/agentStepLoop/utils"

/**
  Current node State & requirements
  - what is nice to have?
  - outcome of the current state of the node (variables)

  Next Node(s) Capabilities & Limitations
  - what tools does the next node have? what are the limitations of the tools?
  - what can the others bring to the table? will they help or hinder?
  Goals & Evaluation
  - what are my goals? what are the workflow goals? does this node cost much for the fitness function?
  - why would i choose this node over the others?
  Past Experience & Memory
  - what is my memory of the last time i worked together with this node?
  - when i had this input last time, did i succeed when giving it to this node?
  - what do my memories say?
  Alternatives & Trade-offs
  - what other options do i have? what are the pros and cons of each?
 */
export async function chooseHandoffSequential({
  systemPrompt,
  workflowMessage,
  handOffs,
  content,
  agentSteps,
  memory,
}: ChooseHandoffOpts): Promise<HandoffResult> {
  if (handOffs.length === 0) {
    throw new Error("No handoffs provided")
  }

  if (handOffs.length === 1 && !handOffs.includes("end")) {
    return buildResultHandoff({
      data: {
        handoff: handOffs[0],
        reason: "Only one valid handoff option available",
        hasError: false,
        handoffContext: "Direct handoff to single available node",
      },
      success: true,
      error: undefined,
      usdCost: 0,
      replyMessage: {
        kind: "sequential",
        berichten: [{ type: "text", text: content }],
      },
      content,
      workflowMessage,
    })
  } else if (handOffs.length === 1 && handOffs.includes("end")) {
    return buildResultHandoff({
      data: {
        handoff: "end",
        reason: "Workflow termination requested",
        hasError: false,
        handoffContext: "End of workflow execution",
      },
      success: true,
      error: undefined,
      usdCost: 0,
      replyMessage: {
        kind: "result",
        berichten: [{ type: "text", text: content }],
      },
      content,
      workflowMessage,
    })
  }

  const usageContext = agentSteps ? toolUsageToString(agentSteps) : ""

  const memoryContext =
    memory && Object.keys(memory).length > 0
      ? `\n\nMemory:\n${Object.entries(memory)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n")}`
      : ""

  const contentContext = content
    ? `\n\nContent:\n${JSON.stringify(content)}`
    : ""

  const effectiveHandOffs = [...handOffs]
  if (workflowMessage.fromNodeId !== "start") {
    effectiveHandOffs.push("clarify")
  }

  const handOffsContext =
    effectiveHandOffs.length > 0
      ? `\n\nAvailable handoffs: ${effectiveHandOffs.join(", ")}`
      : ""

  const prompt = `
      #choosing a handoff
      you will have to choose to handle the next work. you have just found this info: ${contentContext}
      this was your instruction: ${systemPrompt}
      this just happened: ${usageContext}
      these are your memories: ${memoryContext}
      ${handOffsContext}
      ${effectiveHandOffs.includes("end") ? handoffPrompts.end : "Choose one of the available handoffs based on what needs to be done next."}
      If you need clarification from the previous node, choose 'clarify' and provide the question in handoffContext.
    `

  const { data, error, usdCost } = await callModelHandoff({
    prompt,
    handOffs: effectiveHandOffs,
  })

  const replyMessage: Payload = {
    kind: "sequential",
    berichten: [
      {
        type: "text",
        text:
          data?.handoffContext ??
          `hey, i just did my part of the workflow. could you continue with your part? + ${handOffsContext}`,
      },
    ],
  }

  return buildResultHandoff({
    data,
    success: !error,
    error: error ?? undefined,
    usdCost: usdCost ?? 0,
    replyMessage,
    content,
    workflowMessage, // Pass workflowMessage
  })
}
