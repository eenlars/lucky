import type { WorkflowConfig } from "@workflow/schema/workflow.types"

export function workflowToAdjacencyList(workflow: WorkflowConfig): string {
  return workflow.nodes
    .map((node) => {
      return `<agent:${node.nodeId}>
    ${node.nodeId}: ${node.description} (tools: ${node.codeTools.join(", ")})
    connects to: ${node.handOffs.join(", ")}
    </agent:${node.nodeId}>`
    })
    .join("")
}
