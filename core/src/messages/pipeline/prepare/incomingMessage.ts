import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { extractTextFromPayload } from "@core/messages/MessagePayload"
import type { AgentSteps } from "@core/messages/pipeline/AgentStep.types"
import { explainSubsetOfTools } from "@core/prompts/explainTools"
import { isNir } from "@core/utils/common/isNir"
import { llmify } from "@core/utils/common/llmify"
import { getMemoryExplanation, type NodeMemory } from "@core/utils/memory/memorySchema"
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
  agentSteps: AgentSteps,
) {
  const toolsAvailable = Object.keys(tools)
  const incomingText = extractTextFromPayload(ctx.workflowMessageIncoming.payload)

  const { data: prepareThinking } = await sendAI({
    model: ctx.nodeConfig.modelName,
    mode: "text",
    // todo speed and accuracy: this is inefficient when the task is simple. also, the assumptions might steer the algorithm too far.
    messages: [
      {
        role: "user",
        content: `
          # role
          you are the agent preparer.
          you aim to prepare it to use tools most effectively by making a plan.

          main_workflow_goal: ${ctx.mainWorkflowGoal}
          evaluation_criteria: 100% accuracy test
          context: we're currently one workflow node, part of a larger system

          current_workflow_node:
          currently, we're one node within the workflow. the node has the following instructions:
          - ${ctx.nodeConfig.systemPrompt}
          ${!isNir(toolsAvailable) ? `the tools it may use: ${explainSubsetOfTools(toolsAvailable)}` : ""}

          the memory of the workflow node:
          ${getMemoryExplanation(nodeMemory)}

          incoming_input:
          ${incomingText || "<no user input provided>"}

          your task (be specific):
          - restate the concrete task you will perform for this node in 1-2 sentences using the incoming_input
          - list the exact sub-steps you will take, including which tool(s) to use and with what key parameters you will need to extract from the incoming_input
          - keep it concise but actionable
          - state very explicitly that you are making assumptions what would work best, as part of a plan to fulfill the objective.

          your output:
          max 3-4 sentences, very dense in information. 
          if the task is assumed to be very easy and likely to succeed, you can output something shorter.
          output assumptions in <assumptions> tags, showing you're not sure it will work.
          outside of assumptions, only say things that are true.
            `,
      },
    ],
  })

  if (prepareThinking && prepareThinking.text) {
    const reasoning = llmify(prepareThinking.text)
    agentSteps.push({
      type: "prepare",
      return: reasoning,
    })
  }

  return
}
