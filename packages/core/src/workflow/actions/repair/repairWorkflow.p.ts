import { AgentDescriptionsWithToolsSchema } from "@node/schemas/agentWithTools"
import type { WorkflowConfig } from "@workflow/schema/workflow.types"
import type { CoreMessage } from "ai"
import z from "zod"

export const WorkflowRepairPrompts = {
  repairWorkflowPrompt: (
    config: WorkflowConfig,
    verificationSummary: string
  ): CoreMessage[] => {
    return [
      {
        role: "user",
        content: `
  <role>
    You are an expert workflow optimizer. Please repair this workflow configuration based on the verification results.
  </role>

  <instructions>
    Provide a repaired workflow configuration that resolves the verification issues.
  </instructions>

  <current-workflow-config>
    ${JSON.stringify(config)}
  </current-workflow-config>

  <errors-in-workflow-config>
    ${verificationSummary}
  </errors-in-workflow-config>

  <task>
    Provide repaired workflow node configurations that resolve the verification issues. 
    You may never have two nodes with the same tool or the same set of tools.
  </task>
  <output>
  apart from the structure, you may change anything to repair the workflow. but it must be valid and work excellently.
  </output>
`.trim(),
      },
    ]
  },
  expectedOutput: z.object({
    nodes: z
      .array(AgentDescriptionsWithToolsSchema)
      .describe("Repaired node configurations"),
    summary: z
      .string()
      .describe("A summary of the changes made to the workflow"),
  }),
}
