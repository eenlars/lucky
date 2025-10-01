import { buildResultHandoff, callModelHandoff, type HandoffResult } from "@core/messages/handoffs/handOffUtils"
import type { ChooseHandoffOpts } from "@core/messages/handoffs/main"
import { buildOrchestratorPrompt } from "@core/messages/handoffs/types/hierarchical.orchestrator"
import { buildReplyMessage } from "@core/messages/handoffs/types/hierarchical.reply"
import { buildWorkerPrompt } from "@core/messages/handoffs/types/hierarchical.worker"
import type { Payload } from "@core/messages/MessagePayload"
import { toolUsageToString } from "@core/messages/pipeline/agentStepLoop/utils"
import { getNodeRole } from "@core/utils/validation/workflow/verifyHierarchical"

export async function chooseHandoffHierarchical({
  workflowMessage,
  handOffs,
  content,
  agentSteps,
  workflowConfig,
}: ChooseHandoffOpts): Promise<HandoffResult> {
  // Get the current node's role based on workflow structure
  const currentNodeId = workflowMessage.toNodeId
  const currentNodeRole = workflowConfig ? getNodeRole(currentNodeId, workflowConfig) : null

  // If no workflow config available, fall back to message-based inference
  const isOrchestrator =
    currentNodeRole === "orchestrator" || (currentNodeRole === null && workflowMessage.fromNodeId === "start")

  const isFromStart = workflowMessage.fromNodeId === "start"

  const usageContext = agentSteps ? toolUsageToString(agentSteps) : ""
  const prompt = isOrchestrator
    ? buildOrchestratorPrompt({
        content,
        handOffs,
        usageContext,
        isFromStart,
        workflowMessage,
      })
    : buildWorkerPrompt({ content, handOffs, usageContext })

  const replyMessage: Payload = buildReplyMessage({ isOrchestrator, content })

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
