import {
  createEdge,
  type AppEdge,
} from "@/react-flow-visualization/components/edges"
import {
  createNodeByType,
  type AppNode,
  type WorkflowNodeData,
} from "@/react-flow-visualization/components/nodes"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"

/**
 * transform the nodes from the setup config to the nodes for the visualizer
 */
export const initialSetupConfig = (
  workflowConfig: WorkflowConfig
): { edges: AppEdge[]; nodes: AppNode[] } => {
  const edges: AppEdge[] = []
  const nodes: AppNode[] = []

  const startNode = createNodeByType({
    type: "initial-node",
    id: "start",
  })

  nodes.push(startNode)

  const endNode = createNodeByType({
    type: "output-node",
    id: "end",
  })

  nodes.push(endNode)

  for (const node of workflowConfig.nodes || []) {
    const nodeData: WorkflowNodeData = {
      nodeId: node.nodeId,
      description: node.description,
      systemPrompt: node.systemPrompt,
      modelName: node.modelName,
      mcpTools: node.mcpTools || [],
      codeTools: node.codeTools || [],
      handOffs: node.handOffs || [],
      memory: node.memory || {},
      title: node.nodeId,
      label: node.description,
      messageCount: 0,
      status: "initial",
    }
    nodes.push(
      createNodeByType({
        type: "transform-node",
        id: node.nodeId,
        data: nodeData,
        position: { x: 0, y: 0 },
      })
    )
  }

  // create edge from start to entry node
  if (workflowConfig.entryNodeId) {
    edges.push(createEdge("start", workflowConfig.entryNodeId))
  }

  // create edges based on handOffs
  for (const node of workflowConfig.nodes || []) {
    if (node.handOffs && node.handOffs.length > 0) {
      for (const handOff of node.handOffs) {
        edges.push(createEdge(node.nodeId, handOff))
      }
    }
  }

  return { edges, nodes }
}
