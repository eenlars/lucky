import {
  buildResultHandoff,
  callModelHandoff,
  handoffPrompts,
  type HandoffResult,
} from "@core/messages/handoffs/handOffUtils"
import type { ChooseHandoffOpts } from "@core/messages/handoffs/main"
import type { Payload } from "@core/messages/MessagePayload"
import { toolUsageToString } from "@core/node/strategies/utils"
import { getNodeRole } from "@core/utils/validation/workflow/verifyHierarchical"

export async function chooseHandoffHierarchical({
  workflowMessage,
  handOffs,
  content,
  toolUsage,
  workflowConfig,
}: ChooseHandoffOpts): Promise<HandoffResult> {
  // Get the current node's role based on workflow structure
  const currentNodeId = workflowMessage.toNodeId
  const currentNodeRole = workflowConfig
    ? getNodeRole(currentNodeId, workflowConfig)
    : null

  // If no workflow config available, fall back to message-based inference
  const isOrchestrator =
    currentNodeRole === "orchestrator" ||
    (currentNodeRole === null && workflowMessage.fromNodeId === "start")

  const isFromStart = workflowMessage.fromNodeId === "start"
  const targets = handOffs.join(", ")

  const usageContext = toolUsage ? toolUsageToString(toolUsage.outputs) : ""

  let prompt = "you are "

  if (isOrchestrator) {
    // Orchestrator logic
    if (isFromStart) {
      // Initial delegation from start
      prompt += `an orchestrator: initial task delegation. user request: ${"prompt" in workflowMessage.payload ? workflowMessage.payload.prompt : ""}${usageContext}
available workers: ${targets}
choose the best worker to handle this request.`
    } else if (workflowMessage.payload.kind === "result") {
      // Reviewing worker result
      prompt += `an orchestrator: reviewing worker result. previous work: ${workflowMessage.payload.workDone}
current result: ${content}${usageContext}
next options: ${targets}
${handOffs.includes("end") ? handoffPrompts.end : `decide next step: delegate to another worker or complete.`}`
    } else {
      // Orchestrator delegating new task
      prompt += `an orchestrator: delegating new task. task: ${content}${usageContext}
available workers: ${targets}
choose the appropriate worker.`
    }
  } else {
    // Worker logic - can only report back to orchestrator or end
    prompt += `a worker: task completed. your work: ${content}${usageContext}
report options: ${targets}
${handOffs.includes("end") ? "complete your work by choosing 'end' or report back to orchestrator." : "report back to orchestrator."}`
  }

  const replyMessage: Payload = isOrchestrator
    ? {
        kind: "delegation",
        prompt: `delegated task: ${content}`,
        context:
          workflowMessage.payload.kind === "result"
            ? `reviewed worker result: ${workflowMessage.payload.workDone}\nnext delegation: ${content}`
            : `orchestrator delegation: ${content}`,
      }
    : { kind: "result", workDone: content }

  const { data, error, usdCost } = await callModelHandoff({
    prompt,
    handOffs,
  })

  return buildResultHandoff({
    success: !error,
    data,
    error: error ?? undefined,
    usdCost: usdCost ?? 0,
    replyMessage,
    content,
    workflowMessage,
  })
}
