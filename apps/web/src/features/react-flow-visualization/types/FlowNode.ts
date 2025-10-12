import type { AllToolNames } from "@lucky/tools"
import type { Node } from "reactflow"

export type NodeData = {
  label: string
  description: string
  status: string
  tasks: string[]
  messageCount: number
  tools: AllToolNames[]
}

export type FlowNode = Node<NodeData>
