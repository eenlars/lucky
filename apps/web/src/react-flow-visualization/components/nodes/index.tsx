import { Node, NodeProps, Position, XYPosition } from "@xyflow/react"
import { nanoid } from "nanoid"

import { iconMapping } from "@/react-flow-visualization/components/ui/icon-mapping"
import type { WorkflowNodeConfig } from "@lucky/core/workflow/schema/workflow.types"
import { MODELS } from "@lucky/examples/settings/constants.client"

import { BranchNode } from "./branch-node"
import { InitialNode } from "./initial-node"
import { JoinNode } from "./join-node"
import { OutputNode } from "./output-node"
import { TransformNode } from "./transform-node"

/* WORKFLOW NODE DATA PROPS ------------------------------------------------------ */

export type WorkflowNodeData = WorkflowNodeConfig & {
  // visualization-specific additions only
  label?: string
  icon?: keyof typeof iconMapping
  status?: "loading" | "success" | "error" | "initial"
  messageCount?: number
  // Required for ReactFlow Node data constraint
  [key: string]: unknown
}

export type WorkflowNodeProps = NodeProps<Node<WorkflowNodeData>> & {
  type: AppNodeType
  children?: React.ReactNode
}

export type NodeConfig = {
  id: AppNodeType
  displayName: string
  status?: "loading" | "success" | "error" | "initial"
  handles: NonNullable<Node["handles"]>
  icon: keyof typeof iconMapping
}

export const NODE_SIZE = { width: 380, height: 180 }
export const COMPACT_NODE_SIZE = { width: 72, height: 72 }

const nodesConfig: Record<AppNodeType, NodeConfig> = {
  "initial-node": {
    id: "initial-node",
    displayName: "Initial Node",
    status: "initial",
    handles: [
      {
        type: "source",
        position: Position.Right,
        x: COMPACT_NODE_SIZE.width,
        y: COMPACT_NODE_SIZE.height * 0.5,
      },
    ],
    icon: "Rocket",
  },
  "transform-node": {
    id: "transform-node",
    displayName: "Transform Node",
    handles: [
      {
        type: "source",
        position: Position.Right,
        x: NODE_SIZE.width,
        y: NODE_SIZE.height * 0.5,
      },
      {
        type: "target",
        position: Position.Left,
        x: 0,
        y: NODE_SIZE.height * 0.5,
      },
    ],
    icon: "Spline",
  },
  "join-node": {
    id: "join-node",
    displayName: "Join Node",
    status: "initial",
    handles: [
      {
        id: "true",
        type: "target",
        position: Position.Left,
        x: 0,
        y: NODE_SIZE.height * 0.3,
      },
      {
        id: "false",
        type: "target",
        position: Position.Left,
        x: 0,
        y: NODE_SIZE.height * 0.7,
      },
      {
        type: "source",
        position: Position.Right,
        x: NODE_SIZE.width,
        y: NODE_SIZE.height * 0.5,
      },
    ],
    icon: "Split",
  },
  "branch-node": {
    id: "branch-node",
    displayName: "Branch Node",
    status: "initial",
    handles: [
      {
        type: "target",
        position: Position.Left,
        x: 0,
        y: NODE_SIZE.height * 0.5,
      },
      {
        id: "true",
        type: "source",
        position: Position.Right,
        x: NODE_SIZE.width,
        y: NODE_SIZE.height * 0.3,
      },
      {
        id: "false",
        type: "source",
        position: Position.Right,
        x: NODE_SIZE.width,
        y: NODE_SIZE.height * 0.7,
      },
    ],
    icon: "Merge",
  },
  "output-node": {
    id: "output-node",
    displayName: "Output Node",
    handles: [
      {
        type: "target",
        position: Position.Left,
        x: 0,
        y: COMPACT_NODE_SIZE.height * 0.5,
      },
    ],
    icon: "CheckCheck",
  },
}

export const nodeTypes = {
  "initial-node": InitialNode,
  "output-node": OutputNode,
  "transform-node": TransformNode,
  "branch-node": BranchNode,
  "join-node": JoinNode,
}

export function createNodeByType({
  type,
  id,
  position = { x: 0, y: 0 },
  data,
}: {
  type: AppNodeType
  id?: string
  position?: XYPosition
  data?: WorkflowNodeData
}): AppNode {
  const node = nodesConfig[type]

  const nodeId = id ?? nanoid()
  const isCompact = type === "initial-node" || type === "output-node"
  const size = isCompact ? COMPACT_NODE_SIZE : NODE_SIZE
  const newNode: AppNode = {
    id: nodeId,
    data: {
      // Core WorkflowNodeConfig properties
      nodeId: data?.nodeId || nodeId,
      nodeType: type,
      description: data?.description ?? "",
      systemPrompt: data?.systemPrompt ?? "",
      modelName: data?.modelName ?? MODELS.default,
      mcpTools: data?.mcpTools ?? [],
      codeTools: data?.codeTools ?? [],
      handOffs: data?.handOffs ?? [],
      memory: data?.memory ?? {},
      // Spread any additional data
      ...data,
      status: node.status,
      icon: node.icon,
    },
    position: {
      x: position.x - size.width * 0.5,
      y: position.y - size.height * 0.5,
    },
    type,
  }

  return newNode
}

export type AppNode =
  | Node<WorkflowNodeData, "initial-node">
  | Node<WorkflowNodeData, "transform-node">
  | Node<WorkflowNodeData, "join-node">
  | Node<WorkflowNodeData, "branch-node">
  | Node<WorkflowNodeData, "output-node">

export type AppNodeType = NonNullable<AppNode["type"]>

export default nodesConfig
