import { llmify } from "@core/utils/common/llmify"
import type { WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"
import { mapModelNameToEasyName } from "@lucky/models"

export function explainAgents(nodes: WorkflowNodeConfig[], easyModelNames = false): string {
  return llmify(`
    ${nodes
      .map(
        node => `
        # agent ${node.nodeId}
        nodeId: ${node.nodeId}
        description: ${node.description}
        systemPrompt: ${node.systemPrompt}
        modelName: ${easyModelNames ? mapModelNameToEasyName(node.modelName) : node.modelName}
        mcpTools: ${JSON.stringify(node.mcpTools)}
        codeTools: ${JSON.stringify(node.codeTools)}
        handOffs: ${JSON.stringify(node.handOffs)}
        memory: ${JSON.stringify(node.memory)}
        `,
      )
      .join("\n")}
  `)
}
