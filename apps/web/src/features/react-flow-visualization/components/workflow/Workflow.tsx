"use client"

import { Background, ConnectionLineType, ReactFlow } from "@xyflow/react"
import { useEffect } from "react"
import { useShallow } from "zustand/react/shallow"

import { AgentDialogInspect } from "@/app/components/agent-dialog-inspect/panel"
import { WorkflowEdge } from "@/features/react-flow-visualization/components/edges/workflow-edge/WorkflowEdge"
import { nodeTypes } from "@/features/react-flow-visualization/components/nodes/nodes"
import { WorkflowPromptBar } from "@/features/react-flow-visualization/components/workflow-prompt-bar/WorkflowPromptBar"
import { useLayout } from "@/features/react-flow-visualization/hooks/use-layout"
// runner context removed
import { useAppStore } from "@/features/react-flow-visualization/store/store"
import { NodePalette } from "./NodePalette"
import { WorkflowControls } from "./controls"
import { ExecutionLogsPanel } from "./execution-logs/ExecutionLogsPanel"
import { useDragAndDrop } from "./useDragAndDrop"

const edgeTypes = {
  workflow: WorkflowEdge,
}

export default function Workflow({
  workflowVersionId,
}: {
  workflowVersionId: string | undefined
}) {
  const {
    nodes,
    edges,
    colorMode,
    workflowLoading,
    workflowError,
    selectedNodeId: _selectedNodeId,
    nodeDetailsOpen: _nodeDetailsOpen,
    logPanelOpen,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeDragStart,
    onNodeDragStop,
    loadWorkflowConfig,
    loadWorkflowVersion,
    closeNodeDetails: _closeNodeDetails,
    updateNode: _updateNode,
    setLogPanelOpen,
  } = useAppStore(
    useShallow(state => ({
      nodes: state.nodes,
      edges: state.edges,
      colorMode: state.colorMode,
      workflowLoading: state.workflowLoading,
      workflowError: state.workflowError,
      selectedNodeId: state.selectedNodeId,
      nodeDetailsOpen: state.nodeDetailsOpen,
      logPanelOpen: state.logPanelOpen,
      onNodesChange: state.onNodesChange,
      onEdgesChange: state.onEdgesChange,
      onConnect: state.onConnect,
      onNodeDragStart: state.onNodeDragStart,
      onNodeDragStop: state.onNodeDragStop,
      loadWorkflowConfig: state.loadWorkflowConfig,
      loadWorkflowVersion: state.loadWorkflowVersion,
      closeNodeDetails: state.closeNodeDetails,
      updateNode: state.updateNode,
      setLogPanelOpen: state.setLogPanelOpen,
    })),
  )

  useEffect(() => {
    if (nodes.length === 0 && !workflowLoading && !workflowError) {
      console.log("Loading workflow data automatically...")
      if (workflowVersionId) {
        console.log("Loading specific workflow version:", workflowVersionId)
        loadWorkflowVersion(workflowVersionId)
      } else {
        console.log("Loading default workflow config (includes layout organization)")
        loadWorkflowConfig()
      }
    }
  }, [nodes.length, workflowLoading, workflowError, workflowVersionId, loadWorkflowConfig, loadWorkflowVersion])

  const { onDragOver, onDrop } = useDragAndDrop()
  const runLayout = useLayout(true)
  const _promptDialogOpen = false
  const _setPromptDialogOpen = (_: boolean) => {}
  const _executeWorkflowWithPrompt = async () => {}
  const _isRunning = false
  const _logMessages: string[] = []

  const proOptions = {
    // passing in the account property will enable hiding the attribution
    // for versions < 10.2 you can use account: 'paid-enterprise'
    account: "paid-pro",
    // in combination with the account property, hideAttribution: true will remove the attribution
    hideAttribution: true,
  }

  if (workflowLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-sm">Loading</p>
        </div>
      </div>
    )
  }

  if (workflowError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-sm text-gray-600 dark:text-gray-400">{workflowError}</p>
          <button
            type="button"
            onClick={() => (workflowVersionId ? loadWorkflowVersion(workflowVersionId) : loadWorkflowConfig())}
            className="text-sm text-gray-900 dark:text-gray-100 underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionLineType={ConnectionLineType.Bezier}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={runLayout}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        selectNodesOnDrag={false}
        colorMode={colorMode}
        defaultEdgeOptions={{ type: "workflow" }}
        proOptions={proOptions}
      >
        <Background gap={20} size={1} color="#e5e7eb" className="bg-gray-50/50" />
        <NodePalette />

        {/* Empty state - guide users to drag from palette */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
            <div className="text-center text-gray-400 dark:text-gray-600 select-none">
              <svg className="size-16 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
                />
              </svg>
              <p className="text-lg font-medium mb-2">Drag a node from the left to start</p>
              <p className="text-sm">or describe your workflow below</p>
            </div>
          </div>
        )}

        <WorkflowControls />
        <WorkflowPromptBar />
      </ReactFlow>

      {/* Steve Jobs-inspired Inspector Panel */}
      <AgentDialogInspect />

      {/* Execution Logs Panel */}
      <ExecutionLogsPanel isOpen={logPanelOpen} onClose={() => setLogPanelOpen(false)} />
    </>
  )
}
