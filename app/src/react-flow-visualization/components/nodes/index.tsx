import { Node, NodeProps, Position, XYPosition } from "@xyflow/react"
import { nanoid } from "nanoid"

import { iconMapping } from "@/react-flow-visualization/components/ui/icon-mapping"
import type { WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"
import { MODELS } from "@runtime/settings/constants.client"

import { BranchNode } from "./branch-node"
import { InitialNode } from "./initial-node"
import { JoinNode } from "./join-node"
import { OutputNode } from "./output-node"
import { TransformNode } from "./transform-node"

/* WORKFLOW NODE DATA PROPS ------------------------------------------------------ */

export type WorkflowNodeData = WorkflowNodeConfig & {
  // visualization-specific additions only
  title?: string
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
  title: string
  status?: "loading" | "success" | "error" | "initial"
  handles: NonNullable<Node["handles"]>
  icon: keyof typeof iconMapping
}

export const NODE_SIZE = { width: 380, height: 180 }
export const COMPACT_NODE_SIZE = { width: 72, height: 72 }

const nodesConfig: Record<AppNodeType, NodeConfig> = {
  "initial-node": {
    id: "initial-node",
    title: "Initial Node",
    status: "initial",
    handles: [
      {
        type: "source",
        position: Position.Bottom,
        x: COMPACT_NODE_SIZE.width * 0.5,
        y: COMPACT_NODE_SIZE.height,
      },
    ],
    icon: "Rocket",
  },
  "transform-node": {
    id: "transform-node",
    title: "Transform Node",
    handles: [
      {
        type: "source",
        position: Position.Bottom,
        x: NODE_SIZE.width * 0.5,
        y: NODE_SIZE.height,
      },
      {
        type: "target",
        position: Position.Top,
        x: NODE_SIZE.width * 0.5,
        y: 0,
      },
    ],
    icon: "Spline",
  },
  "join-node": {
    id: "join-node",
    title: "Join Node",
    status: "initial",
    handles: [
      {
        id: "true",
        type: "target",
        position: Position.Top,
        x: NODE_SIZE.width - 25,
        y: 0,
      },
      {
        id: "false",
        type: "target",
        position: Position.Top,
        x: 25,
        y: 0,
      },
      {
        type: "source",
        position: Position.Bottom,
        x: NODE_SIZE.width * 0.5,
        y: NODE_SIZE.height,
      },
    ],
    icon: "Split",
  },
  "branch-node": {
    id: "branch-node",
    title: "Branch Node",
    status: "initial",
    handles: [
      {
        type: "target",
        position: Position.Top,
        x: NODE_SIZE.width * 0.5,
        y: 0,
      },
      {
        id: "true",
        type: "source",
        position: Position.Bottom,
        x: 25,
        y: NODE_SIZE.height,
      },
      {
        id: "false",
        type: "source",
        position: Position.Bottom,
        x: NODE_SIZE.width - 25,
        y: NODE_SIZE.height,
      },
    ],
    icon: "Merge",
  },
  "output-node": {
    id: "output-node",
    title: "Output Node",
    handles: [
      {
        type: "target",
        position: Position.Top,
        x: COMPACT_NODE_SIZE.width * 0.5,
        y: 0,
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
      description: data?.description ?? "",
      systemPrompt: data?.systemPrompt ?? "",
      modelName: data?.modelName ?? MODELS.default,
      mcpTools: data?.mcpTools ?? [],
      codeTools: data?.codeTools ?? [],
      handOffs: data?.handOffs ?? [],
      memory: data?.memory ?? {},
      // Spread any additional data
      ...data,
      // visualization-specific (override if needed)
      title: node.title,
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
