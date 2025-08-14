"use client"

import { useCallback, useRef, useState } from "react"
import { useShallow } from "zustand/react/shallow"

import { AppEdge } from "@/react-flow-visualization/components/edges"
import { AppNode } from "@/react-flow-visualization/components/nodes"
import { useAppStore } from "@/react-flow-visualization/store"
/**
 * This is a demo workflow runner that runs a simplified version of a workflow.
 * You can customize how nodes are processed by overriding `processNode` or
 * even replacing the entire `collectNodesToProcess` function with your own logic.
 */
export function useWorkflowRunner() {
  // runner removed; keep noop API for compatibility
  const [logMessages] = useState<string[]>([])
  const [promptDialogOpen, setPromptDialogOpen] = useState(false)
  const [pendingStartNodeId, setPendingStartNodeId] = useState<
    string | undefined
  >()
  const isRunning = useRef(false)
  const { getNodes, setNodes, getEdges, exportToJSON, currentWorkflowId } =
    useAppStore(
      useShallow((s) => ({
        getNodes: s.getNodes,
        setNodes: s.setNodes,
        getEdges: s.getEdges,
        exportToJSON: s.exportToJSON,
        currentWorkflowId: s.currentWorkflowId,
      }))
    )

  const stopWorkflow = useCallback(() => {
    isRunning.current = false
  }, [])

  const resetNodeStatus = useCallback(() => {
    setNodes(
      getNodes().map((node: AppNode) => ({
        ...node,
        data: { ...node.data, status: "initial" },
      }))
    )
  }, [getNodes, setNodes])

  const updateNodeStatus = useCallback(
    (nodeId: string, status: string) => {
      setNodes(
        getNodes().map((node: AppNode) =>
          node.id === nodeId
            ? ({ ...node, data: { ...node.data, status } } as AppNode)
            : node
        )
      )
    },
    [setNodes, getNodes]
  )

  const processNode = useCallback(
    async (node: AppNode) => {
      updateNodeStatus(node.id, "loading")

      await new Promise((resolve) => setTimeout(resolve, 2000))

      if (!isRunning.current) {
        resetNodeStatus()
        return
      }

      updateNodeStatus(node.id, "success")
    },
    [updateNodeStatus, resetNodeStatus]
  )

  const executeWorkflowWithPrompt = useCallback(
    async (_prompt: string) => {},
    []
  )

  const runWorkflow = useCallback(
    async (startNodeId?: string) => {
      if (isRunning.current) return
      const nodes = getNodes()
      const edges = getEdges()
      isRunning.current = true

      // runner removed
      setPendingStartNodeId(startNodeId)
      setPromptDialogOpen(false)
      isRunning.current = false
    },
    [getNodes, getEdges]
  )

  return {
    logMessages,
    runWorkflow,
    stopWorkflow,
    isRunning: isRunning.current,
    promptDialogOpen,
    setPromptDialogOpen,
    executeWorkflowWithPrompt,
  }
}

/**
 * This is a very simplified example of how you might traverse a graph and collect nodes to process.
 * It's not meant to be used in production, but you can use it as a starting point for your own logic.
 */
function collectNodesToProcess(
  nodes: AppNode[],
  edges: AppEdge[],
  startNodeId: string
) {
  const nodesToProcess: AppNode[] = []
  const visited = new Set()

  function visit(nodeId: string) {
    if (visited.has(nodeId)) return
    visited.add(nodeId)

    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return

    nodesToProcess.push(node)

    const outgoingEdges = edges.filter((e) => e.source === nodeId)
    for (const edge of outgoingEdges) {
      visit(edge.target)
    }
  }

  visit(startNodeId)

  return nodesToProcess
}
