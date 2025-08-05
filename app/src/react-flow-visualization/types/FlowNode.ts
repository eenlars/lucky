import type { AllToolNames } from "@core/tools/tool.types"
import { Node } from "reactflow"

export type NodeData = {
  label: string
  description: string
  status: string
  tasks: string[]
  messageCount: number
  tools: AllToolNames[]
}

export type FlowNode = Node<NodeData>
