// /core/node/generate/from-text.ts

import { sendAI } from "@core/messages/api/sendAI"
import { buildSimpleMessage } from "@core/messages/create/buildSimpleMessage"
import { AgentDescriptionsWithToolsSchema } from "@core/node/schemas/agentWithTools"
import type { WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"
import { getDefaultModels } from "@runtime/settings/constants.client"

// this generates a workflow node from a text prompt
export async function generateAgentFromText(
  text: string
): Promise<{ config: WorkflowNodeConfig; usdCost: number }> {
  const systemPrompt = `
    You are an expert at generating agents from text prompts.
    You will generate an agent that is a single step in a workflow.
    `

  const userPrompt = `
    Generate an agent from the following text prompt: ${text}`

  const messages = buildSimpleMessage({
    message: userPrompt,
    systemPrompt,
    nodeDescription:
      "agent generator that creates workflow nodes from text descriptions",
    workflowFiles: [],
  })

  const response = await sendAI({
    messages,
    model: getDefaultModels().default,
    mode: "structured",
    schema: AgentDescriptionsWithToolsSchema,
  })

  if (!response.success) {
    throw new Error(response.error)
  }

  const workflow = response.data as WorkflowNodeConfig

  return { config: workflow, usdCost: response.usdCost ?? 0 }
}
