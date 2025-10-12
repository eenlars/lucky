import type { Edge } from "@xyflow/react"
import ELK, { type ElkNode, type ElkPort } from "elkjs/lib/elk.bundled.js"

import type { AppNode } from "@/features/react-flow-visualization/components/nodes/nodes"

/**
 * Configuration options for the graph layout algorithm
 */
export type LayoutConfig = {
  /** Flow direction: LEFT, RIGHT, UP, DOWN */
  direction?: "LEFT" | "RIGHT" | "UP" | "DOWN"
  /** Spacing between layers (horizontal spacing for left-right flow) */
  layerSpacing?: number
  /** Spacing between nodes in the same layer */
  nodeSpacing?: number
  /** Spacing between separate components */
  componentSpacing?: number
  /** Edge routing algorithm */
  edgeRouting?: "SPLINES" | "ORTHOGONAL" | "POLYLINE"
  /** Node placement strategy */
  nodePlacementStrategy?: "SIMPLE" | "INTERACTIVE" | "LINEAR_SEGMENTS" | "NETWORK_SIMPLEX" | "BRANDES_KOEPF"
  /** Layering strategy */
  layeringStrategy?: "NETWORK_SIMPLEX" | "LONGEST_PATH" | "INTERACTIVE" | "MIN_WIDTH" | "COFFMAN_GRAHAM"
  /** Whether to preserve user positioning where possible */
  preserveUserPositioning?: boolean
}

/**
 * Result of the layout algorithm
 */
export type LayoutResult = {
  /** Nodes with updated positions */
  nodes: AppNode[]
  /** Validation warnings (non-fatal) */
  warnings: string[]
  /** Statistics about the layout */
  stats: {
    nodesProcessed: number
    nodesPositioned: number
    disconnectedNodes: number
  }
}

/**
 * Validation result for layout inputs
 */
export type ValidationResult = {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Default layout configuration optimized for workflow graphs
 */
const DEFAULT_CONFIG: Required<LayoutConfig> = {
  direction: "RIGHT",
  layerSpacing: 150, // Increased for more consistent horizontal spacing
  nodeSpacing: 80, // Increased for more consistent vertical spacing
  componentSpacing: 150,
  edgeRouting: "SPLINES",
  nodePlacementStrategy: "NETWORK_SIMPLEX",
  layeringStrategy: "NETWORK_SIMPLEX",
  preserveUserPositioning: true,
}

/**
 * Validates layout algorithm inputs
 */
export function validateLayoutInputs(nodes: AppNode[], edges: Edge[]): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate nodes
  if (!Array.isArray(nodes)) {
    errors.push("Nodes must be an array")
  } else {
    if (nodes.length === 0) {
      warnings.push("No nodes provided for layout")
    }

    const nodeIds = new Set<string>()
    for (const node of nodes) {
      const nodeId = node.id
      if (!nodeId) {
        errors.push("All nodes must have an id")
        continue
      }
      if (nodeIds.has(nodeId)) {
        errors.push(`Duplicate node id found: ${nodeId}`)
      }
      nodeIds.add(nodeId)

      if (!node.type) {
        warnings.push(`Node ${nodeId} is missing a type`)
      }
    }
  }

  // Validate edges
  if (!Array.isArray(edges)) {
    errors.push("Edges must be an array")
  } else {
    const nodeIds = new Set(nodes.map(n => n.id))
    const edgeIds = new Set<string>()

    for (const edge of edges) {
      if (!edge.id) {
        errors.push("All edges must have an id")
        break
      }
      if (edgeIds.has(edge.id)) {
        errors.push(`Duplicate edge id found: ${edge.id}`)
      }
      edgeIds.add(edge.id)

      if (!edge.source) {
        errors.push(`Edge ${edge.id} is missing source`)
      } else if (!nodeIds.has(edge.source)) {
        errors.push(`Edge ${edge.id} references non-existent source node: ${edge.source}`)
      }

      if (!edge.target) {
        errors.push(`Edge ${edge.id} is missing target`)
      } else if (!nodeIds.has(edge.target)) {
        errors.push(`Edge ${edge.id} references non-existent target node: ${edge.target}`)
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Converts layout config to ELK layout options
 */
function configToElkOptions(config: Required<LayoutConfig>): Record<string, string> {
  return {
    "elk.algorithm": "layered",
    "elk.direction": config.direction,
    // Layer spacing - horizontal distance between layers
    "elk.layered.spacing.nodeNodeBetweenLayers": String(config.layerSpacing),
    "elk.layered.spacing.edgeNodeBetweenLayers": String(config.layerSpacing),
    // Node spacing - vertical distance between nodes in same layer
    "elk.spacing.nodeNode": String(config.nodeSpacing),
    "elk.spacing.nodeNodeBetweenLayers": String(config.layerSpacing),
    // Node placement and layering strategies - BRANDES_KOEPF for straighter layouts
    "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
    "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
    "elk.layered.nodePlacement.favorStraightEdges": "true",
    "elk.layered.layering.strategy": config.layeringStrategy,
    // Crossing minimization
    "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
    "elk.layered.crossingMinimization.semiInteractive": String(config.preserveUserPositioning),
    // Component separation
    "elk.separateConnectedComponents": "true",
    "elk.spacing.componentComponent": String(config.componentSpacing),
    // Edge routing
    "elk.edgeRouting": config.edgeRouting,
    "elk.layered.spacing.edgeEdgeBetweenLayers": "30",
    "elk.layered.spacing.edgeNode": "50",
    // Priority and ordering
    "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
    "elk.priority": "1",
    // Straightening - helps keep sequential nodes aligned
    "elk.layered.nodePlacement.linearSegments.deflectionDampening": "0.3",
    "elk.layered.nodePlacement.bk.edgeStraightening": "IMPROVE_STRAIGHTNESS",
  }
}

/**
 * Creates port configurations for ELK based on node handles
 */
function createNodePorts(
  node: AppNode,
  getHandles: (type: string) => Array<{ id?: string | null; type: string }>,
): ElkPort[] {
  const handles = getHandles(node.type!)
  const ports: ElkPort[] = []

  for (const handle of handles) {
    const portId = `${node.id}-${handle.type}-${handle.id ?? null}`
    ports.push({
      id: portId,
      layoutOptions: {
        side: handle.type === "target" ? "WEST" : "EAST",
      },
    })
  }

  return ports
}

/**
 * Graph layout algorithm using ELK
 *
 * This function takes a graph represented as nodes and edges, applies a hierarchical
 * layered layout algorithm, and returns nodes with updated positions.
 *
 * Features:
 * - Automatic layering: nodes at the same hierarchical level are aligned vertically
 * - Crossing minimization: reduces edge crossings for clarity
 * - Smooth edge routing: uses splines for elegant curved connections
 * - User positioning preservation: respects manual node placement where possible
 *
 * @param nodes - Array of workflow nodes to layout
 * @param edges - Array of edges connecting the nodes
 * @param config - Optional layout configuration (uses optimized defaults if not provided)
 * @param getNodeHandles - Function to retrieve handle configuration for a node type
 * @returns Layout result with positioned nodes and statistics
 * @throws Error if validation fails
 */
export async function layoutGraph(
  nodes: AppNode[],
  edges: Edge[],
  config: LayoutConfig = {},
  getNodeHandles: (type: string) => Array<{ id?: string | null; type: string }> = () => [],
): Promise<LayoutResult> {
  // Validate inputs
  const validation = validateLayoutInputs(nodes, edges)
  if (!validation.isValid) {
    throw new Error(`Layout validation failed: ${validation.errors.join(", ")}`)
  }

  // Merge config with defaults
  const fullConfig: Required<LayoutConfig> = { ...DEFAULT_CONFIG, ...config }

  // Track connected nodes
  const connectedNodeIds = new Set<string>()
  for (const edge of edges) {
    connectedNodeIds.add(edge.source)
    connectedNodeIds.add(edge.target)
  }

  // Build ELK graph structure
  const elk = new ELK()
  const elkGraph: ElkNode = {
    id: "root",
    layoutOptions: configToElkOptions(fullConfig),
    edges: edges.map(edge => ({
      id: edge.id,
      sources: [`${edge.source}-source-${edge.sourceHandle ?? null}`],
      targets: [`${edge.target}-target-${edge.targetHandle ?? null}`],
    })),
    children: nodes
      .filter(node => connectedNodeIds.has(node.id))
      .map(node => {
        const ports = createNodePorts(node, getNodeHandles)
        return {
          id: node.id,
          width: node.width ?? node.measured?.width ?? 150,
          height: node.height ?? node.measured?.height ?? 50,
          ports: [
            // Default port for simple connections
            {
              id: node.id,
              layoutOptions: { side: "EAST" },
            },
            ...ports,
          ],
          layoutOptions: {
            "org.eclipse.elk.portConstraints": "FIXED_ORDER",
          },
        }
      }),
  }

  // Run ELK layout algorithm
  const elkResult = await elk.layout(elkGraph)

  // Create a map for quick lookups
  const layoutedNodesMap = new Map((elkResult.children ?? []).map(n => [n.id, n]))

  // Apply layout results to nodes
  let nodesPositioned = 0
  const layoutedNodes: AppNode[] = nodes.map(node => {
    const elkNode = layoutedNodesMap.get(node.id)

    // If node wasn't in ELK result (disconnected), keep original position
    if (!elkNode) {
      return node
    }

    // If ELK didn't calculate position or position is same, keep original
    if (
      elkNode.x === undefined ||
      elkNode.y === undefined ||
      (elkNode.x === node.position.x && elkNode.y === node.position.y)
    ) {
      return node
    }

    nodesPositioned++
    return {
      ...node,
      position: {
        x: elkNode.x,
        y: elkNode.y,
      },
      style: { ...node.style, opacity: 1 },
    }
  })

  // Post-process: Align start and end nodes at the same height
  const alignedNodes = alignStartEndNodes(layoutedNodes)

  // Build result
  const result: LayoutResult = {
    nodes: alignedNodes,
    warnings: validation.warnings,
    stats: {
      nodesProcessed: nodes.length,
      nodesPositioned,
      disconnectedNodes: nodes.length - connectedNodeIds.size,
    },
  }

  return result
}

/**
 * Aligns nodes horizontally for cleaner sequential layouts
 *
 * For sequential workflows, aligns all nodes by their CENTER to prevent
 * the "waterfall" effect and ensure nodes of different heights appear aligned.
 *
 * Strategy: Use the start node's center Y as the reference point.
 * This accounts for nodes having different heights (e.g., start/end nodes
 * are smaller than agent nodes), ensuring visual center alignment.
 */
function alignStartEndNodes(nodes: AppNode[]): AppNode[] {
  if (nodes.length === 0) {
    return nodes
  }

  // Find the start node and calculate its center Y
  const startNode = nodes.find(n => n.id === "start")
  if (!startNode) {
    return nodes
  }

  const startHeight = startNode.height ?? startNode.measured?.height ?? 50
  const referenceCenterY = startNode.position.y + startHeight / 2

  // Only align start and end nodes to preserve ELK's vertical spacing for branches
  return nodes.map(node => {
    // Only process start and end nodes
    if (node.id !== "start" && node.id !== "end") {
      return node
    }

    const nodeHeight = node.height ?? node.measured?.height ?? 50
    const newY = referenceCenterY - nodeHeight / 2

    return {
      ...node,
      position: {
        ...node.position,
        y: newY,
      },
    }
  })
}

/**
 * Creates a layout config optimized for workflow graphs with branching
 */
export function createWorkflowLayoutConfig(): LayoutConfig {
  return {
    direction: "RIGHT",
    layerSpacing: 150,
    nodeSpacing: 80,
    componentSpacing: 150,
    edgeRouting: "SPLINES",
    nodePlacementStrategy: "NETWORK_SIMPLEX",
    layeringStrategy: "NETWORK_SIMPLEX",
    preserveUserPositioning: true,
  }
}

/**
 * Creates a layout config optimized for compact, simple graphs
 */
export function createCompactLayoutConfig(): LayoutConfig {
  return {
    direction: "RIGHT",
    layerSpacing: 100,
    nodeSpacing: 60,
    componentSpacing: 100,
    edgeRouting: "SPLINES",
    nodePlacementStrategy: "SIMPLE",
    layeringStrategy: "LONGEST_PATH",
    preserveUserPositioning: false,
  }
}
