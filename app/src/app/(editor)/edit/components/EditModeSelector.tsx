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
  }, [workflowVersion, updateWorkflowJSON, loadWorkflowFromData, organizeLayout])

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

  return (
    <div className="h-full flex flex-col">
      {/* Mode Selector Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Workflow Editor
            </h1>
            {workflowVersion && (
              <p className="text-sm text-gray-600 mt-1">
                Version: {workflowVersion.wf_version_id}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {mode === "graph" && (
              <button
                onClick={organizeLayout}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors cursor-pointer"
              >
                📐 Organize
              </button>
            )}

            <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => handleModeChange("graph")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  mode === "graph"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                🔗 Graph Mode
              </button>
              <button
                onClick={() => handleModeChange("json")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  mode === "json"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                📝 JSON Mode
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Content */}
      <div className="flex-1 overflow-hidden">
        {mode === "graph" ? (
          <ReactFlowProvider>
            <SidebarLayout>
              <AppContextMenu>
                <Workflow workflowVersionId={workflowVersion?.wf_version_id} />
              </AppContextMenu>
            </SidebarLayout>
          </ReactFlowProvider>
        ) : (
          <JSONEditor
            workflowVersion={workflowVersion}
            initialContent={workflowJSON}
            onContentChange={handleJSONChange}
          />
        )}
      </div>
    </div>
  )
}
