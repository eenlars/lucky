"use client"

import { useCallback, useRef, useState } from "react"
import { useShallow } from "zustand/react/shallow"

import type { AppEdge } from "@/react-flow-visualization/components/edges/edges"
import type { AppNode } from "@/react-flow-visualization/components/nodes/nodes"
import { useAppStore } from "@/react-flow-visualization/store/store"
/**
 * This is a demo workflow runner that runs a simplified version of a workflow.
 * You can customize how nodes are processed by overriding `processNode` or
 * even replacing the entire `collectNodesToProcess` function with your own logic.
 */
export function useWorkflowRunner() {
  // runner removed; keep noop API for compatibility
  const [logMessages] = useState<string[]>([])
  const [promptDialogOpen, setPromptDialogOpen] = useState(false)
  const [_pendingStartNodeId, _setPendingStartNodeId] = useState<string | undefined>()
  const isRunning = useRef(false)
  const {
    getNodes,
    setNodes,
    getEdges,
    exportToJSON: _exportToJSON,
    currentWorkflowId: _currentWorkflowId,
  } = useAppStore(
    useShallow(s => ({
      getNodes: s.getNodes,
      setNodes: s.setNodes,
      getEdges: s.getEdges,
      exportToJSON: s.exportToJSON,
      currentWorkflowId: s.currentWorkflowId,
    })),
  )

  const stopWorkflow = useCallback(() => {
    isRunning.current = false
  }, [])

  const _resetNodeStatus = useCallback(() => {
    setNodes(
      getNodes().map((node: AppNode) => ({
        ...node,
        data: { ...node.data, status: "initial" },
      })),
    )
  }, [getNodes, setNodes])

  const _updateNodeStatus = useCallback((_nodeId: string, _status: string) => {
    // Functionality removed
  }, [])

  const _processNode = useCallback(async (_node: AppNode) => {
    // Functionality removed
  }, [])

  const executeWorkflowWithPrompt = useCallback(async (_prompt: string) => {}, [])

  const runWorkflow = useCallback(
    async (_startNodeId?: string) => {
      if (isRunning.current) return
      const _nodes = getNodes()
      const _edges = getEdges()
      isRunning.current = true

      // runner removed
      _setPendingStartNodeId(_startNodeId)
      setPromptDialogOpen(false)
      isRunning.current = false
    },
    [getNodes, getEdges],
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
function _collectNodesToProcess(_nodes: AppNode[], _edges: AppEdge[], _startNodeId: string) {
  const _nodesToProcess: AppNode[] = []
  const _visited = new Set()

  function _visit(_nodeId: string) {
    if (_visited.has(_nodeId)) return
    _visited.add(_nodeId)

    const _node = _nodes.find(n => n.id === _nodeId)
    if (!_node) return

    _nodesToProcess.push(_node)

    const _outgoingEdges = _edges.filter(e => e.source === _nodeId)
    for (const _edge of _outgoingEdges) {
      _visit(_edge.target)
    }
  }

  _visit(_startNodeId)

  return _nodesToProcess
}
