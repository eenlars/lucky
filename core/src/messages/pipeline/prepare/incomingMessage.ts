import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { extractTextFromPayload } from "@core/messages/MessagePayload"
import type { AgentSteps } from "@core/messages/pipeline/AgentStep.types"
import { explainSubsetOfTools } from "@core/prompts/explainTools"
import { isNir } from "@core/utils/common/isNir"
import {
  getMemoryExplanation,
  type NodeMemory,
} from "@core/utils/memory/memorySchema"
import { getDefaultModels } from "@runtime/settings/models"
import type { ToolSet } from "ai"
import type { NodeInvocationCallContext } from "../input.types"

/*
  what do we need to do our task well?
  - memory
  - what tools do we have?
  - what is the workflow goal?
  - who am i? (the node)
*/
export async function prepareIncomingMessage(
  ctx: NodeInvocationCallContext,
  tools: ToolSet,
  nodeMemory: NodeMemory,
  agentSteps: AgentSteps
) {
  const toolsAvailable = Object.keys(tools)
  const incomingText = extractTextFromPayload(
    ctx.workflowMessageIncoming.payload
  )

  const { data: prepareThinking } = await sendAI({
    model: getDefaultModels().nano,
    mode: "text",
    messages: [
      {
        role: "user",
        content: `
          main_workflow_goal: ${ctx.mainWorkflowGoal}
          evaluation_criteria: 100% accuracy test
          context: we're currently one workflow node, part of a larger system

          current_workflow_node:
          currently, we're one node within the workflow. the node has the following instructions:
          - ${ctx.nodeConfig.systemPrompt}
          ${!isNir(toolsAvailable) ? `resources: ${explainSubsetOfTools(toolsAvailable)}` : ""}
          ${getMemoryExplanation(nodeMemory)}

          incoming_input:
          ${incomingText || "<no user input provided>"}

          your task (be specific):
          - restate the concrete task you will perform for this node in 1-2 sentences using the incoming_input
          - list the exact sub-steps you will take, including which tool(s) to use and with what key parameters you will need to extract from the incoming_input
          - highlight any REQUIRED fields you must have before calling tools; if any are missing, state precisely what is missing, but do not assume they are missing if present in incoming_input
          - keep it concise but actionable
            `,
      },
    ],
  })

  if (prepareThinking && prepareThinking.text) {
    const reasoning = prepareThinking.text
    agentSteps.push({
      type: "prepare",
      return: reasoning,
    })
  }

  return
}
