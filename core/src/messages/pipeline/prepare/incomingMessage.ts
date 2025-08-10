import { sendAI } from "@core/messages/api/sendAI/sendAI"
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

          your task: output what this node can do to score 100% on the eval, keep it as concise as possible, but make sure you cover all the steps.
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
