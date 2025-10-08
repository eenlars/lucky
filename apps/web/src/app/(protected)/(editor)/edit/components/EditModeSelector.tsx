"use client"

import { Button } from "@/components/ui/button"
import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import type { Tables } from "@lucky/shared/client"
import { ReactFlowProvider } from "@xyflow/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { useShallow } from "zustand/react/shallow"

import AppContextMenu from "@/react-flow-visualization/components/app-context-menu"
import SidebarLayout from "@/react-flow-visualization/components/layouts/sidebar-layout/SidebarLayout"
import Workflow from "@/react-flow-visualization/components/workflow/Workflow"
import { useAppStore } from "@/react-flow-visualization/store/store"

import EditorHeader from "./EditorHeader"
import JSONEditor from "./JSONEditor"

import DatasetSelector from "@/components/DatasetSelector"
// Eval mode (table) + run store
import WorkflowIOTable from "@/components/WorkflowIOTable"
import { useRunConfigStore } from "@/stores/run-config-store"
import { toWorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import WorkflowInvocationButton from "./WorkflowInvocationButton"

async function loadFromDSLClientDisplay(dslConfig: any) {
  const response = await fetch("/api/workflow/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflow: dslConfig, mode: "dsl-display" }),
  })
  const result = await response.json()
  if (!result.isValid) {
    throw new Error(result.errors?.[0] || "Invalid workflow configuration")
  }
  return result.config
}

type EditMode = "graph" | "json" | "eval"

interface EditModeSelectorProps {
  workflowVersion?: Tables<"WorkflowVersion">
}

export default function EditModeSelector({ workflowVersion }: EditModeSelectorProps) {
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
    useShallow(state => ({
      nodes: state.nodes,
      edges: state.edges,
      workflowJSON: state.workflowJSON,
      loadWorkflowFromData: state.loadWorkflowFromData,
      exportToJSON: state.exportToJSON,
      updateWorkflowJSON: state.updateWorkflowJSON,
      syncJSONToGraph: state.syncJSONToGraph,
      organizeLayout: state.organizeLayout,
    })),
  )

  // Eval mode state (shared store)
  const {
    cases,
    busyIds: _busyIds,
    resultsById: _resultsById,
    goal,
    setGoal,
    datasetId,
    addCase,
    updateCase: _updateCase,
    removeCase: _removeCase,
    loadDataset,
    runOne,
    runAll,
    cancel: _cancel,
  } = useRunConfigStore(
    useShallow(s => ({
      cases: s.cases,
      busyIds: s.busyIds,
      resultsById: s.resultsById,
      goal: s.goal,
      setGoal: s.setGoal,
      datasetId: s.datasetId,
      addCase: s.addCase,
      updateCase: s.updateCase,
      removeCase: s.removeCase,
      loadDataset: s.loadDataset,
      runOne: s.runOne,
      runAll: s.runAll,
      cancel: s.cancel,
    })),
  )

  const [datasetLoading, setDatasetLoading] = useState(false)

  const createCase = useCallback(
    async (payload: { input: string; expected: string }) => {
      addCase({ input: payload.input, expected: payload.expected })
    },
    [addCase],
  )

  const handleDatasetSelect = useCallback(
    async (datasetId: string) => {
      setDatasetLoading(true)
      try {
        await loadDataset(datasetId)
        if (datasetId) {
          // Get the updated case count after loading
          const currentState = useRunConfigStore.getState()
          toast.success(`Dataset loaded with ${currentState.cases.length} test cases`)
        } else {
          toast.success("Dataset selection cleared")
        }
      } catch (error) {
        toast.error(`Failed to load dataset: ${error instanceof Error ? error.message : "Unknown error"}`)
      } finally {
        setDatasetLoading(false)
      }
    },
    [loadDataset],
  )

  // Note: runner context is consumed inside a child component to avoid
  // provider-order violations when switching modes.

  // Handle JSON content changes from JSON mode
  const handleJSONChange = useCallback(
    (newContent: string) => {
      updateWorkflowJSON(newContent)
    },
    [updateWorkflowJSON],
  )

  // Auto-organize once on initial mount for /edit (no workflowVersion)
  // Guarded to run only once even if nodes change multiple times
  const organizedOnceRef = useRef(false)
  useEffect(() => {
    if (!workflowVersion && _nodes && _nodes.length > 0 && !organizedOnceRef.current) {
      organizedOnceRef.current = true
      // Defer to next tick to ensure ReactFlow is mounted
      setTimeout(() => {
        organizeLayout()
      }, 0)
    }
  }, [workflowVersion, _nodes, organizeLayout])

  useEffect(() => {
    const modeFromParams = searchParams.get("mode")
    const validModes: EditMode[] = ["graph", "json", "eval"]

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
    // Check for demo workflow in sessionStorage first
    const demoWorkflow = sessionStorage.getItem("demo_workflow")
    if (demoWorkflow && !workflowVersion) {
      try {
        const workflow = JSON.parse(demoWorkflow) as WorkflowConfig
        const jsonString = JSON.stringify(workflow, null, 2)
        updateWorkflowJSON(jsonString)
        loadWorkflowFromData(workflow).then(() => {
          organizeLayout()
        })
        // Clear the demo workflow from sessionStorage after loading
        sessionStorage.removeItem("demo_workflow")
      } catch (error) {
        console.error("Failed to load demo workflow:", error)
      }
      return
    }

    if (
      workflowVersion?.dsl &&
      typeof workflowVersion.dsl === "object" &&
      workflowVersion.dsl !== null &&
      !Array.isArray(workflowVersion.dsl)
    ) {
      const jsonString = JSON.stringify(workflowVersion.dsl, null, 2)
      updateWorkflowJSON(jsonString)
      loadWorkflowFromData(workflowVersion.dsl as unknown as WorkflowConfig).then(() => {
        // Auto-organize layout once data is loaded
        organizeLayout()
      })
    }
  }, [workflowVersion, updateWorkflowJSON, loadWorkflowFromData, organizeLayout])

  const handleModeChange = async (newMode: EditMode) => {
    // Sync data when switching modes
    if (mode === "graph" && (newMode === "json" || newMode === "eval")) {
      // Switching from graph to JSON/Eval - export graph data (auto-updates store)
      exportToJSON()
    } else if (mode === "json" && (newMode === "graph" || newMode === "eval")) {
      // Switching from JSON to graph/Eval - import JSON data
      await syncJSONToGraph()
    }

    setMode(newMode)
    const params = new URLSearchParams(searchParams.toString())
    params.set("mode", newMode)
    router.push(`?${params.toString()}`)
  }

  // Common actions for all modes (run functionality now in WorkflowPromptBar)
  const commonActions = null

  if (mode === "graph") {
    const graphActions = (
      <>
        <WorkflowInvocationButton workflowVersionId={workflowVersion?.wf_version_id} />
        <Button
          onClick={organizeLayout}
          variant="ghost"
          size="sm"
          className="group relative"
          data-testid="organize-layout-button"
        >
          <span className="opacity-60 group-hover:opacity-100">Organize</span>
          <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 bg-gray-900 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
            Cmd+L
          </span>
        </Button>
        <Button
          onClick={() => {
            // TODO: Implement save functionality
          }}
          variant="default"
          size="sm"
          data-testid="save-workflow-button"
        >
          Save
        </Button>
        {commonActions}
      </>
    )

    return (
      <ReactFlowProvider>
        <SidebarLayout
          title={`Workflow Editor${workflowVersion ? ` (${workflowVersion.wf_version_id})` : ""}`}
          right={<EditorHeader title="" mode={mode} onModeChange={handleModeChange} actions={graphActions} />}
          showToggle={true}
        >
          <AppContextMenu>
            <Workflow workflowVersionId={workflowVersion?.wf_version_id} />
          </AppContextMenu>
        </SidebarLayout>
      </ReactFlowProvider>
    )
  }

  if (mode === "json") {
    return (
      <ReactFlowProvider>
        <SidebarLayout
          title={`Workflow Editor${workflowVersion ? ` (${workflowVersion.wf_version_id})` : ""}`}
          right={<EditorHeader title="" mode={mode} onModeChange={handleModeChange} actions={commonActions} />}
          showToggle={false}
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

  if (mode === "eval") {
    return (
      <ReactFlowProvider>
        <SidebarLayout
          title={`Workflow Editor${workflowVersion ? ` (${workflowVersion.wf_version_id})` : ""}`}
          right={<EditorHeader title="" mode={mode} onModeChange={handleModeChange} actions={commonActions} />}
          showToggle={false}
        >
          <div className="p-4">
            {/* Header Section */}
            <div className="mb-4 space-y-4">
              <div className="grid grid-cols-[1fr_auto] gap-4 items-end">
                <div className="space-y-3">
                  {/* Goal Section */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="evaluation-goal"
                      className="text-xs font-semibold text-gray-700 uppercase tracking-wide"
                    >
                      Goal{" "}
                      <span className="text-gray-500 normal-case font-normal">(Define your evaluation objective)</span>
                    </label>
                    <input
                      id="evaluation-goal"
                      type="text"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder:text-gray-400"
                      placeholder="e.g., 'Evaluate customer service responses' or 'Test data analysis accuracy'"
                      value={goal}
                      onChange={e => setGoal(e.target.value)}
                      data-testid="evaluation-goal-input"
                    />
                  </div>

                  {/* Dataset Section */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="dataset-selector"
                      className="text-xs font-semibold text-gray-700 uppercase tracking-wide"
                    >
                      Dataset{" "}
                      <span className="text-gray-500 normal-case font-normal">(Load test cases from database)</span>
                    </label>
                    <div className="w-full max-w-xs" id="dataset-selector">
                      <DatasetSelector
                        selectedDatasetId={datasetId}
                        onSelect={handleDatasetSelect}
                        disabled={datasetLoading}
                      />
                      {datasetLoading && <div className="text-xs text-gray-500 mt-1">Loading dataset records...</div>}
                    </div>
                  </div>
                </div>

                {/* Run All Button */}
                <Button
                  onClick={async () => {
                    const json = exportToJSON()
                    const parsed = JSON.parse(json)
                    const cfgMaybe = toWorkflowConfig(parsed)
                    if (!cfgMaybe) {
                      toast.error("Invalid workflow configuration")
                      return
                    }
                    const cfg = await loadFromDSLClientDisplay(cfgMaybe)
                    await runAll(cfg)
                  }}
                  disabled={!cases.length}
                  className="bg-black hover:bg-gray-800 h-10"
                  data-testid="run-all-tests-button"
                >
                  Run All ({cases.length})
                </Button>
              </div>
            </div>

            {/* Test Cases Section */}
            <div className="bg-white rounded border border-gray-200">
              <WorkflowIOTable
                ios={cases}
                onRun={async row => {
                  const json = exportToJSON()
                  const parsed = JSON.parse(json)
                  const cfgMaybe = toWorkflowConfig(parsed)
                  if (!cfgMaybe) {
                    toast.error("Invalid workflow configuration")
                    return
                  }
                  const cfg = await loadFromDSLClientDisplay(cfgMaybe)
                  await runOne(cfg, row)
                }}
              />

              <div className="p-3 border-t flex items-center justify-between">
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => createCase({ input: "", expected: "" })}
                  className="text-gray-600 hover:text-black"
                  data-testid="add-test-case-button"
                >
                  + Add Test
                </Button>
                <div className="text-xs text-gray-400">Tab = Next · Enter = Run</div>
              </div>
            </div>
          </div>
        </SidebarLayout>
      </ReactFlowProvider>
    )
  }

  // Fallback (should not hit)
  return null
}
