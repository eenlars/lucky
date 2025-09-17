"use client"

import { useCallback, useRef, useState, useEffect } from "react"
import { useShallow } from "zustand/react/shallow"

import { AppEdge } from "@/react-flow-visualization/components/edges"
import { AppNode } from "@/react-flow-visualization/components/nodes"
import { useAppStore } from "@/react-flow-visualization/store"
import { useWorkflowStreamContext } from "@/contexts/WorkflowStreamContext"
import { useWorkflowStream } from "@/hooks/useWorkflowStream"
/**
 * This is a demo workflow runner that runs a simplified version of a workflow.
 * You can customize how nodes are processed by overriding `processNode` or
 * even replacing the entire `collectNodesToProcess` function with your own logic.
 */
export function useWorkflowRunner() {
  // runner removed; keep noop API for compatibility
  const [logMessages] = useState<string[]>([])
  const [promptDialogOpen, setPromptDialogOpen] = useState(false)
  const [_pendingStartNodeId, _setPendingStartNodeId] = useState<
    string | undefined
  >()
  const [currentInvocationId, setCurrentInvocationId] = useState<string | null>(null)
  const isRunning = useRef(false)
  const {
    getNodes,
    setNodes,
    getEdges,
    exportToJSON: _exportToJSON,
    currentWorkflowId: _currentWorkflowId,
  } = useAppStore(
    useShallow((s) => ({
      getNodes: s.getNodes,
      setNodes: s.setNodes,
      getEdges: s.getEdges,
      exportToJSON: s.exportToJSON,
      currentWorkflowId: s.currentWorkflowId,
    }))
  )

  // Real-time workflow stream integration
  const { events, isConnected } = useWorkflowStream({
    invocationId: currentInvocationId || undefined,
    events: ['node:execution:started', 'node:execution:completed', 'workflow:completed'],
  })

  // Update node statuses based on real-time events
  useEffect(() => {
    if (!currentInvocationId || events.length === 0) return

    const nodeStatusMap = new Map<string, "loading" | "success" | "error" | "initial">()
    
    // Process events to determine current node statuses
    for (const event of events) {
      const nodeId = (event as any).nodeId
      if (!nodeId) continue

      switch (event.event) {
        case 'node:execution:started':
          nodeStatusMap.set(nodeId, 'loading')
          break
        case 'node:execution:completed':
          const status = (event as any).status === 'failed' ? 'error' : 'success'
          nodeStatusMap.set(nodeId, status)
          break
      }
    }

    // Update React Flow nodes with new statuses
    const currentNodes = getNodes()
    const updatedNodes = currentNodes.map((node: AppNode) => {
      const status = nodeStatusMap.get(node.id)
      if (status && node.data.status !== status) {
        return {
          ...node,
          data: { ...node.data, status }
        }
      }
      return node
    })

    // Only update if there are actual changes
    if (updatedNodes.some((node, index) => node.data.status !== currentNodes[index]?.data.status)) {
      setNodes(updatedNodes)
    }

    // Check if workflow is completed
    const workflowCompleted = events.some(e => e.event === 'workflow:completed')
    if (workflowCompleted && isRunning.current) {
      isRunning.current = false
    }
  }, [events, currentInvocationId, getNodes, setNodes])

  const stopWorkflow = useCallback(() => {
    isRunning.current = false
  }, [])

  const _resetNodeStatus = useCallback(() => {
    setNodes(
      getNodes().map((node: AppNode) => ({
        ...node,
        data: { ...node.data, status: "initial" },
      }))
    )
  }, [getNodes, setNodes])

  const _updateNodeStatus = useCallback((_nodeId: string, _status: string) => {
    // Functionality removed
  }, [])

  const _processNode = useCallback(async (_node: AppNode) => {
    // Functionality removed
  }, [])

  const executeWorkflowWithPrompt = useCallback(
    async (_prompt: string) => {},
    []
  )

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
    // Real-time workflow information
    currentInvocationId,
    setCurrentInvocationId,
    isStreamConnected: isConnected,
    workflowEvents: events,
    getNodeStatus: (nodeId: string) => {
      const nodeStarted = events.some(e => 
        e.event === 'node:execution:started' && (e as any).nodeId === nodeId
      )
      const nodeCompleted = events.find(e => 
        e.event === 'node:execution:completed' && (e as any).nodeId === nodeId
      )
      
      if (nodeCompleted) {
        return (nodeCompleted as any).status === 'failed' ? 'error' : 'success'
      }
      if (nodeStarted) {
        return 'loading'
      }
      return 'initial'
    },
  }
}

/**
 * This is a very simplified example of how you might traverse a graph and collect nodes to process.
 * It's not meant to be used in production, but you can use it as a starting point for your own logic.
 */
function _collectNodesToProcess(
  _nodes: AppNode[],
  _edges: AppEdge[],
  _startNodeId: string
) {
  const _nodesToProcess: AppNode[] = []
  const _visited = new Set()

  function _visit(_nodeId: string) {
    if (_visited.has(_nodeId)) return
    _visited.add(_nodeId)

    const _node = _nodes.find((n) => n.id === _nodeId)
    if (!_node) return

    _nodesToProcess.push(_node)

    const _outgoingEdges = _edges.filter((e) => e.source === _nodeId)
    for (const _edge of _outgoingEdges) {
      _visit(_edge.target)
    }
  }

  _visit(_startNodeId)

  return _nodesToProcess
}
