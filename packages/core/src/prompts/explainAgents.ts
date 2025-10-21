import { llmify } from "@core/utils/common/llmify"
import type { WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"
import { mapModelToTier } from "@lucky/models"

export function explainAgents(nodes: WorkflowNodeConfig[], tierMappingEnabled = false): string {
  return llmify(`
    ${nodes
      .map(
        node => `
        # agent ${node.nodeId}
        nodeId: ${node.nodeId}
        description: ${node.description}
        systemPrompt: ${node.systemPrompt}
        gatewayModelId: ${tierMappingEnabled ? mapModelToTier(node.gatewayModelId) : node.gatewayModelId}
        mcpTools: ${JSON.stringify(node.mcpTools)}
        codeTools: ${JSON.stringify(node.codeTools)}
        handOffs: ${JSON.stringify(node.handOffs)}
        memory: ${JSON.stringify(node.memory)}
        `,
      )
      .join("\n")}
  `)
}
