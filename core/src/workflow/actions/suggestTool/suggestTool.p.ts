import { toolsExplanations } from "@core/prompts/explainTools"
import { llmify } from "@core/utils/common/llmify"
import type { ModelMessage } from "ai"
import z from "zod"

export const SuggestToolPrompts = {
  newTool: z.string().describe(
    llmify(`
      <task>
      create a new tool that will help us solve the bottleneck.
      </task>

      <context>
        We currently have the following tools: ${toolsExplanations()}. 
      </context>

      <task>
      If we need a new tool, please explain why and what it should do. 
      It needs to be a tool with straightforward input and output.
      </task>

      <bad example>
      'dataEnrichment' validates and enriches location data by cross-referencing multiple trusted data sources.
      </bad example>

      <good example>
      'searchGoogleMaps' searches for businesses on Google Maps.
      </good example>

      <limitations>
      Note that creating a tool is not the answer to every problem. 
      It should be distinct from the existing tools and serve a specific purpose 
      that is not already covered by the existing tools.
        </limitations>`)
  ),
  suggestNewTool: ({
    problemDescription,
    workflowDescription,
  }: {
    problemDescription: string
    workflowDescription: string
  }): ModelMessage[] => {
    return [
      {
        role: "user",
        content: llmify(`
      <task>
      Suggest a new tool that will help us solve the bottleneck.
      </task>

      <context>
        We currently have the following tools: ${toolsExplanations()}.
      </context>

      <problem>
        ${problemDescription}
      </problem>

      <workflow>
        ${llmify(workflowDescription)}
      </workflow>

      <output>
        provide a tool name and description for addressing this bottleneck.
      </output>
      `),
      },
    ]
  },
}
