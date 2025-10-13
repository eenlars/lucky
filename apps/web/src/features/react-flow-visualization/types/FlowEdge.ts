import type { Edge } from "reactflow"

export type EdgeData = {
  messageType: string
}

export type FlowEdge = Edge<EdgeData>
