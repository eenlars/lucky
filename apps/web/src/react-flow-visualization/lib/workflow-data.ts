import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import { createEdge, type AppEdge } from "../components/edges"
import { createNodeByType, type AppNode, type WorkflowNodeData } from "../components/nodes"

/**
 * transform the nodes from the setup config to the nodes for the visualizer.
 * IMPORTANT: the start node and the end node are created here, and they are not part of the workflowConfig.nodes array.
 */
export const initialSetupConfig = (workflowConfig: WorkflowConfig): { edges: AppEdge[]; nodes: AppNode[] } => {
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
      handOffType: node.handOffType,
      memory: node.memory || {},
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
      }),
    )
  }

  // create edge from start to entry node
  if (workflowConfig.entryNodeId) {
    edges.push(createEdge("start", workflowConfig.entryNodeId))
  }

  // create edges based on handOffs
  for (const node of workflowConfig.nodes || []) {
    const handoffs = node.handOffs || []
    for (const handOff of handoffs) {
      edges.push(createEdge(node.nodeId, handOff))
    }
  }

  // Ensure sinks attach to end: any non-start/non-end node with no outgoing edge
  const outBySource = new Map<string, number>()
  for (const e of edges) {
    outBySource.set(e.source, (outBySource.get(e.source) ?? 0) + 1)
  }
  for (const node of workflowConfig.nodes || []) {
    const id = node.nodeId
    if (id === "start" || id === "end") continue
    if ((outBySource.get(id) ?? 0) === 0) {
      edges.push(createEdge(id, "end"))
    }
  }

  return { edges, nodes }
}

/**
 * Convert a Core WorkflowConfig into frontend React Flow graph primitives.
 * Frontend naming: use this as the canonical transformer.
 */
export const toFrontendWorkflowConfig = (workflowConfig: WorkflowConfig): { edges: AppEdge[]; nodes: AppNode[] } => {
  return initialSetupConfig(workflowConfig)
}
