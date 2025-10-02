"use client"

import { Background, ConnectionLineType, ReactFlow } from "@xyflow/react"
import { useEffect } from "react"
import { useShallow } from "zustand/react/shallow"

import { WorkflowEdge } from "@/react-flow-visualization/components/edges/workflow-edge"
import { NodeDetailsDialog } from "@/react-flow-visualization/components/node-details-dialog-human"
import { nodeTypes } from "@/react-flow-visualization/components/nodes"
import { useLayout } from "@/react-flow-visualization/hooks/use-layout"
// runner context removed
import { useAppStore } from "@/react-flow-visualization/store"
import { WorkflowControls } from "./controls"
import { useDragAndDrop } from "./useDragAndDrop"

const edgeTypes = {
  workflow: WorkflowEdge,
}

export default function Workflow({ workflowVersionId }: { workflowVersionId: string | undefined }) {
  const {
    nodes,
    edges,
    colorMode,
    workflowLoading,
    workflowError,
    selectedNodeId,
    nodeDetailsOpen,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeDragStart,
    onNodeDragStop,
    loadWorkflowConfig,
    loadWorkflowVersion,
    closeNodeDetails,
    updateNode,
  } = useAppStore(
    useShallow(state => ({
      nodes: state.nodes,
      edges: state.edges,
      colorMode: state.colorMode,
      workflowLoading: state.workflowLoading,
      workflowError: state.workflowError,
      selectedNodeId: state.selectedNodeId,
      nodeDetailsOpen: state.nodeDetailsOpen,
      onNodesChange: state.onNodesChange,
      onEdgesChange: state.onEdgesChange,
      onConnect: state.onConnect,
      onNodeDragStart: state.onNodeDragStart,
      onNodeDragStop: state.onNodeDragStop,
      loadWorkflowConfig: state.loadWorkflowConfig,
      loadWorkflowVersion: state.loadWorkflowVersion,
      closeNodeDetails: state.closeNodeDetails,
      updateNode: state.updateNode,
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4" />
          <p>Loading workflow configuration...</p>
        </div>
      </div>
    )
  }

  if (workflowError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-600">
          <p className="mb-2">Failed to load workflow configuration</p>
          <p className="text-sm">{workflowError}</p>
          <button
            onClick={() => (workflowVersionId ? loadWorkflowVersion(workflowVersionId) : loadWorkflowConfig())}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const selectedNode = selectedNodeId ? nodes.find(node => node.id === selectedNodeId) : null

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionLineType={ConnectionLineType.SmoothStep}
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
        <Background />
        <WorkflowControls />
      </ReactFlow>

      {selectedNode && (
        <NodeDetailsDialog
          open={nodeDetailsOpen}
          onOpenChange={open => {
            if (!open) closeNodeDetails()
          }}
          nodeData={selectedNode.data}
          onSave={updateNode}
        />
      )}

      {/* Runner removed */}
    </>
  )
}
