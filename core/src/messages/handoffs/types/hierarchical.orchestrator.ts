import { handoffPrompts } from "@core/messages/handoffs/handOffUtils"
import { extractTextFromPayload } from "@core/messages/MessagePayload"
import type { WorkflowMessage } from "@core/messages/WorkflowMessage"

export function buildOrchestratorPrompt(params: {
  content: string
  handOffs: string[]
  usageContext?: string
  isFromStart: boolean
  workflowMessage: WorkflowMessage
}): string {
  const {
    content,
    handOffs,
    usageContext = "",
    isFromStart,
    workflowMessage,
  } = params
  const options = handOffs.join(", ")
  const incomingMessages = extractTextFromPayload(workflowMessage.payload)

  if (isFromStart) {
    return `
        Role: Orchestrator
        Task: initial delegation

        User request: ${incomingMessages}
        ${usageContext ? `\nTools usage: ${usageContext}` : ""}

        Available workers: ${options}

        Instruction: Choose the best worker to handle this request.
    `
  }

  if (workflowMessage.payload.kind === "result") {
    const instruction = handOffs.includes("end")
      ? handoffPrompts.end.trim()
      : "Instruction: Delegate to another worker or continue."

    return `
    Role: Orchestrator
    Task: review worker result and decide next step

    Previous work: ${incomingMessages}

    Current result: ${content}
    ${usageContext ? `\n\nTools usage: ${usageContext}` : ""}

    Options: ${options}

    ${instruction}
    `
  }

  return `
    Role: Orchestrator
    Task: delegate new work

    Input: ${content}
    ${usageContext ? `\n\nTools usage: ${usageContext}` : ""}

    Options: ${options}

    Instruction: Choose the appropriate worker.
    `
}
