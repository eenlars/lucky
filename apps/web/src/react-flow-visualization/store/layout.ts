import type { Edge } from "@xyflow/react"
import ELK, { type ElkNode, type ElkPort } from "elkjs/lib/elk.bundled.js"

import nodesConfig, { type AppNode } from "@/react-flow-visualization/components/nodes/nodes"

const elk = new ELK()

const layoutOptions = {
  "elk.algorithm": "layered",
  "elk.direction": "RIGHT", // Left-to-right flow direction
  "elk.layered.spacing.edgeNodeBetweenLayers": "40",
  "elk.spacing.nodeNode": "80",
  "elk.layered.nodePlacement.strategy": "SIMPLE",
  "elk.separateConnectedComponents": "true",
  "elk.spacing.componentComponent": "100",
}

function createTargetPort(id: string) {
  return {
    id,
    layoutOptions: {
      side: "WEST", // Input ports on the left side for left-to-right flow
    },
  }
}

function createSourcePort(id: string) {
  return {
    id,
    layoutOptions: {
      side: "EAST", // Output ports on the right side for left-to-right flow
    },
  }
}

function getPorts(node: AppNode) {
  const handles = nodesConfig[node.type!].handles

  const targetPorts: ElkPort[] = []
  const sourcePorts: ElkPort[] = []

  handles?.forEach(handle => {
    if (handle.type === "target") {
      targetPorts.push(createTargetPort(`${node.id}-target-${handle.id ?? null}`))
    }

    if (handle.type === "source") {
      sourcePorts.push(createSourcePort(`${node.id}-source-${handle.id ?? null}`))
    }
  })

  return { targetPorts, sourcePorts }
}

export async function layoutGraph(nodes: AppNode[], edges: Edge[]) {
  const connectedNodes = new Set()

  const graph: ElkNode = {
    id: "root",
    layoutOptions,
    edges: edges.map(edge => {
      connectedNodes.add(edge.source)
      connectedNodes.add(edge.target)
      return {
        id: edge.id,
        sources: [`${edge.source}-source-${edge.sourceHandle ?? null}`],
        targets: [`${edge.target}-target-${edge.targetHandle ?? null}`],
      }
    }),
    children: nodes.reduce<ElkNode[]>((acc, node) => {
      if (!connectedNodes.has(node.id)) {
        return acc
      }

      const { targetPorts, sourcePorts } = getPorts(node)
      acc.push({
        id: node.id,
        // TODO: we could use intial sizes here
        width: node.width ?? node.measured?.width ?? 150,
        height: node.height ?? node.measured?.height ?? 50,
        ports: [createSourcePort(node.id), ...targetPorts, ...sourcePorts],
        layoutOptions: {
          "org.eclipse.elk.portConstraints": "FIXED_ORDER",
        },
      })
      return acc
    }, []),
  }

  const elkNodes = await elk.layout(graph)

  const layoutedNodesMap = new Map(elkNodes.children?.map(n => [n.id, n]))

  const layoutedNodes: AppNode[] = nodes.map(node => {
    const layoutedNode = layoutedNodesMap.get(node.id)

    if (!layoutedNode) {
      return node
    }

    if (
      layoutedNode.x === undefined ||
      layoutedNode.y === undefined ||
      (layoutedNode.x === node.position.x && layoutedNode.y === node.position.y)
    ) {
      return node
    }

    return {
      ...node,
      position: {
        x: layoutedNode.x,
        y: layoutedNode.y,
      },
      style: { ...node.style, opacity: 1 },
    }
  })

  return layoutedNodes
}
