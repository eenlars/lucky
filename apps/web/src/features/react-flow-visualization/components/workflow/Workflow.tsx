"use client"

import { Background, ConnectionLineType, ReactFlow, useReactFlow } from "@xyflow/react"
import { useEffect, useRef } from "react"
import { useShallow } from "zustand/react/shallow"

import { AgentDialogInspect } from "@/app/components/agent-dialog/panel"
import { ExecutionLogsPanel } from "@/features/cli-inspection/components/ExecutionLogsPanel"
import { WorkflowEdge } from "@/features/react-flow-visualization/components/edges/workflow-edge/WorkflowEdge"
import { nodeTypes } from "@/features/react-flow-visualization/components/nodes/nodes"
import { WorkflowPromptBar } from "@/features/react-flow-visualization/components/workflow-prompt-bar/WorkflowPromptBar"
// runner context removed
import { useAppStore } from "@/features/react-flow-visualization/store/store"
import { useModelPreferencesStore } from "@/stores/model-preferences-store"
import { useRunnerStore } from "@/stores/runner-store"
import { NodePalette } from "./NodePalette"
import { WorkflowControls } from "./controls"
import { useDragAndDrop } from "./useDragAndDrop"

const edgeTypes = {
  workflow: WorkflowEdge,
}

// Helper component to auto-center viewport when nodes load
function AutoFitView({ nodeCount }: { nodeCount: number }) {
  const { fitView } = useReactFlow()
  const hasFitRef = useRef(false)

  useEffect(() => {
    if (nodeCount > 0 && !hasFitRef.current) {
      console.log("📐 AutoFitView: Centering viewport on", nodeCount, "nodes")
      setTimeout(() => {
        fitView({ padding: 0.5, duration: 200, maxZoom: 1 })
        hasFitRef.current = true
      }, 100)
    }
  }, [nodeCount, fitView])

  return null
}

export default function Workflow({ workflowVersionId }: { workflowVersionId: string | undefined }) {
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

  // Get editor mode from runner store
  const { editorMode } = useRunnerStore()

  // Load model preferences early (before workflows load)
  const { loadPreferences, preferences } = useModelPreferencesStore()

  useEffect(() => {
    // Load preferences on mount if not already loaded
    if (!preferences) {
      console.log("[Workflow] Loading model preferences before workflow...")
      loadPreferences()
    }
  }, [preferences, loadPreferences])

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
      <div className="relative w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={editorMode === "create-new" ? undefined : onNodesChange}
          onEdgesChange={editorMode === "create-new" ? undefined : onEdgesChange}
          onConnect={editorMode === "create-new" ? undefined : onConnect}
          connectionLineType={ConnectionLineType.Bezier}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onDragOver={editorMode === "create-new" ? undefined : onDragOver}
          onDrop={editorMode === "create-new" ? undefined : onDrop}
          onNodeDragStart={editorMode === "create-new" ? undefined : onNodeDragStart}
          onNodeDragStop={editorMode === "create-new" ? undefined : onNodeDragStop}
          selectNodesOnDrag={false}
          colorMode={colorMode}
          defaultEdgeOptions={{ type: "workflow" }}
          proOptions={proOptions}
          nodesDraggable={editorMode !== "create-new"}
          nodesConnectable={editorMode !== "create-new"}
          elementsSelectable={editorMode !== "create-new"}
          className={
            editorMode === "create-new" ? "blur-md transition-all duration-300" : "transition-all duration-300"
          }
        >
          <Background gap={20} size={1} color="#e5e7eb" className="bg-gray-50/50" />
          <AutoFitView nodeCount={nodes.length} />
          <NodePalette />
          <WorkflowControls />
        </ReactFlow>

        {/* Create-new mode overlay */}
        {editorMode === "create-new" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
            <div className="text-center space-y-4 -mt-32">
              <h1 className="text-5xl font-semibold text-gray-900 dark:text-gray-100">What do you want to build?</h1>
              <p className="text-xl text-gray-600 dark:text-gray-400">Describe your workflow below</p>
              <div className="flex items-center gap-2 justify-center text-sm text-gray-500 dark:text-gray-500">
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded font-mono text-xs">⌘K</kbd>
                <span>to focus prompt</span>
              </div>
            </div>
          </div>
        )}

        {/* Prompt bar - outside ReactFlow so it stays sharp */}
        <WorkflowPromptBar />
      </div>

      {/* Steve Jobs-inspired Inspector Panel */}
      <AgentDialogInspect />

      {/* Execution Logs Panel */}
      <ExecutionLogsPanel isOpen={logPanelOpen} onClose={() => setLogPanelOpen(false)} />
    </>
  )
}
