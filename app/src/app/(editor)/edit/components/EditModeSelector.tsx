"use client"

import type { Tables } from "@core/utils/clients/supabase/types"
import { ReactFlowProvider } from "@xyflow/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { useShallow } from "zustand/react/shallow"

import AppContextMenu from "@/react-flow-visualization/components/app-context-menu"
import SidebarLayout from "@/react-flow-visualization/components/layouts/sidebar-layout"
import Workflow from "@/react-flow-visualization/components/workflow"
import { useAppStore } from "@/react-flow-visualization/store"

import {
  WorkflowRunnerProvider,
  useWorkflowRunnerContext,
} from "@/react-flow-visualization/hooks/workflow-runner-context"
import { Button } from "@/ui/button"
import { Play } from "lucide-react"
import JSONEditor from "./JSONEditor"

type EditMode = "graph" | "json"

interface EditModeSelectorProps {
  workflowVersion?: Tables<"WorkflowVersion">
}

export default function EditModeSelector({
  workflowVersion,
}: EditModeSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<EditMode>("graph")

  const {
    nodes: _nodes,
    edges: _edges,
    workflowJSON,
    loadWorkflowFromData,
    exportToJSON,
    updateWorkflowJSON,
    syncJSONToGraph,
    organizeLayout,
  } = useAppStore(
    useShallow((state) => ({
      nodes: state.nodes,
      edges: state.edges,
      workflowJSON: state.workflowJSON,
      loadWorkflowFromData: state.loadWorkflowFromData,
      exportToJSON: state.exportToJSON,
      updateWorkflowJSON: state.updateWorkflowJSON,
      syncJSONToGraph: state.syncJSONToGraph,
      organizeLayout: state.organizeLayout,
    }))
  )

  // Note: runner context is consumed inside a child component to avoid
  // provider-order violations when switching modes.

  // Handle JSON content changes from JSON mode
  const handleJSONChange = useCallback(
    (newContent: string) => {
      updateWorkflowJSON(newContent)
    },
    [updateWorkflowJSON]
  )

  useEffect(() => {
    const modeFromParams = searchParams.get("mode")
    const validModes: EditMode[] = ["graph", "json"]

    if (modeFromParams && validModes.includes(modeFromParams as EditMode)) {
      setMode(modeFromParams as EditMode)
    } else {
      // Default to graph mode and update URL if no valid mode is present
      setMode("graph")
      if (modeFromParams && !validModes.includes(modeFromParams as EditMode)) {
        const params = new URLSearchParams(searchParams.toString())
        params.set("mode", "graph")
        router.replace(`?${params.toString()}`)
      }
    }
  }, [searchParams, router])

  // Load initial data into graph when component mounts
  useEffect(() => {
    if (workflowVersion && workflowVersion.dsl) {
      const jsonString = JSON.stringify(workflowVersion.dsl, null, 2)
      updateWorkflowJSON(jsonString)
      loadWorkflowFromData(workflowVersion.dsl).then(() => {
        // Auto-organize layout once data is loaded
        organizeLayout()
      })
    }
  }, [
    workflowVersion,
    updateWorkflowJSON,
    loadWorkflowFromData,
    organizeLayout,
  ])

  const handleModeChange = async (newMode: EditMode) => {
    // Sync data when switching modes
    if (mode === "graph" && newMode === "json") {
      // Switching from graph to JSON - export graph data (auto-updates store)
      exportToJSON()
    } else if (mode === "json" && newMode === "graph") {
      // Switching from JSON to graph - import JSON data
      await syncJSONToGraph()
    }

    setMode(newMode)
    const params = new URLSearchParams(searchParams.toString())
    params.set("mode", newMode)
    router.push(`?${params.toString()}`)
  }

  if (mode === "graph") {
    const GraphHeaderButtons = () => {
      const { setPromptDialogOpen } = useWorkflowRunnerContext()
      return (
        <div className="flex items-center space-x-2 ml-3">
          <Button
            onClick={() => setPromptDialogOpen(true)}
            className="cursor-pointer px-2"
          >
            <Play /> Run with Prompt
          </Button>
        </div>
      )
    }

    const HeaderRight = (
      <div className="flex items-center space-x-2">
        <button
          onClick={organizeLayout}
          className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors cursor-pointer"
        >
          📐 Organize
        </button>
        <GraphHeaderButtons />
        <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => handleModeChange("graph")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${"bg-white text-gray-900 shadow-sm"}`}
          >
            🔗 Graph Mode
          </button>
          <button
            onClick={() => handleModeChange("json")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer text-gray-600 hover:text-gray-900 hover:bg-gray-50`}
          >
            📝 JSON Mode
          </button>
        </div>
      </div>
    )

    return (
      <WorkflowRunnerProvider>
        <ReactFlowProvider>
          <SidebarLayout
            title={`Workflow Editor${workflowVersion ? ` (${workflowVersion.wf_version_id})` : ""}`}
            right={HeaderRight}
          >
            <AppContextMenu>
              <Workflow workflowVersionId={workflowVersion?.wf_version_id} />
            </AppContextMenu>
          </SidebarLayout>
        </ReactFlowProvider>
      </WorkflowRunnerProvider>
    )
  }

  // JSON mode
  const JsonHeaderRight = (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => handleModeChange("graph")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer text-gray-600 hover:text-gray-900 hover:bg-gray-50`}
        >
          🔗 Graph Mode
        </button>
        <button
          onClick={() => handleModeChange("json")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer bg-white text-gray-900 shadow-sm`}
        >
          📝 JSON Mode
        </button>
      </div>
    </div>
  )

  return (
    <ReactFlowProvider>
      <SidebarLayout
        title={`Workflow Editor${workflowVersion ? ` (${workflowVersion.wf_version_id})` : ""}`}
        right={JsonHeaderRight}
      >
        <JSONEditor
          workflowVersion={workflowVersion}
          initialContent={workflowJSON}
          onContentChange={handleJSONChange}
        />
      </SidebarLayout>
    </ReactFlowProvider>
  )
}
