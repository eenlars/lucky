"use client"

import type { Tables } from "@lucky/shared"
import { ReactFlowProvider } from "@xyflow/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { useShallow } from "zustand/react/shallow"
import { Button } from "@/ui/button"

import AppContextMenu from "@/react-flow-visualization/components/app-context-menu"
import SidebarLayout from "@/react-flow-visualization/components/layouts/sidebar-layout"
import Workflow from "@/react-flow-visualization/components/workflow"
import { useAppStore } from "@/react-flow-visualization/store"

import JSONEditor from "./JSONEditor"
import ModeSwitcher from "./ModeSwitcher"

// Eval mode (table) + run store
import WorkflowIOTable from "@/components/WorkflowIOTable"
import DatasetSelector from "@/components/DatasetSelector"
import { PromptInputDialog } from "@/react-flow-visualization/components/prompt-input-dialog"
import { useRunConfigStore } from "@/stores/run-config-store"
import { toWorkflowConfig } from "@core/workflow/schema/workflow.types"
import { loadFromDSLClient, loadFromDSLClientDisplay } from "@core/workflow/setup/WorkflowLoader.client"

type EditMode = "graph" | "json" | "eval"

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
    useShallow((s) => ({
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
    }))
  )

  const createCase = useCallback(
    async (payload: { input: string; expected: string }) => {
      addCase({ input: payload.input, expected: payload.expected })
    },
    [addCase]
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

  // Auto-organize once on initial mount for /edit (no workflowVersion)
  // Guarded to run only once even if nodes change multiple times
  const organizedOnceRef = useRef(false)
  useEffect(() => {
    if (
      !workflowVersion &&
      _nodes &&
      _nodes.length > 0 &&
      !organizedOnceRef.current
    ) {
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

  if (mode === "graph") {
    const GraphHeaderButtons = () => {
      const [promptDialogOpen, setPromptDialogOpen] = useState(false)
      const [isRunning, setIsRunning] = useState(false)
      const [logs, setLogs] = useState<string[]>([])

      const addLog = (message: string) => {
        setLogs((prev) => [...prev, message])
      }

      const handleExecuteWorkflow = async (prompt: string) => {
        setIsRunning(true)
        setLogs([])

        try {
          addLog("Starting workflow execution...")
          await new Promise((resolve) => setTimeout(resolve, 300))

          addLog("Exporting workflow configuration...")
          const json = exportToJSON()
          const parsed = JSON.parse(json)
          const cfgMaybe = toWorkflowConfig(parsed)

          if (!cfgMaybe) {
            addLog("❌ Error: Invalid workflow configuration")
            return
          }

          await new Promise((resolve) => setTimeout(resolve, 200))
          addLog("Loading workflow configuration...")
          const cfg = await loadFromDSLClient(cfgMaybe)

          await new Promise((resolve) => setTimeout(resolve, 200))
          addLog("Sending request to workflow API...")
          const response = await fetch("/api/workflow/invoke", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dslConfig: cfg,
              evalInput: {
                type: "text",
                question: prompt,
                answer: "",
                goal: "Prompt run",
                workflowId: "adhoc-ui",
              },
            }),
          })

          addLog("Processing response...")
          const result = await response.json()

          if (result?.success) {
            const first = result?.data?.[0]
            const out =
              first?.queueRunResult?.finalWorkflowOutput ??
              first?.finalWorkflowOutputs
            addLog("✅ Workflow completed successfully!")
            addLog(`Result: ${out || "No response"}`)
          } else {
            addLog(`❌ Error: ${result?.error || "Unknown error"}`)
          }
        } catch (error) {
          addLog(`❌ Error: ${error}`)
        } finally {
          setIsRunning(false)
        }
      }

      const handleDialogOpenChange = (open: boolean) => {
        if (isRunning) return // prevent closing during execution
        setPromptDialogOpen(open)
        if (!open) {
          setLogs([])
        }
      }

      return (
        <>
          <Button
            onClick={() => setPromptDialogOpen(true)}
            disabled={isRunning}
            variant="outline"
            size="sm"
          >
            {isRunning ? "Running..." : "Run with Prompt"}
          </Button>
          <PromptInputDialog
            open={promptDialogOpen}
            onOpenChange={handleDialogOpenChange}
            onExecute={handleExecuteWorkflow}
            loading={isRunning}
            logs={logs}
          />
        </>
      )
    }

    const HeaderRight = (
      <div className="flex items-center space-x-2">
        <Button
          onClick={organizeLayout}
          variant="ghost"
          size="sm"
          className="group relative"
        >
          <span className="opacity-60 group-hover:opacity-100">Organize</span>
          <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 bg-gray-900 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
            Cmd+L
          </span>
        </Button>
        <GraphHeaderButtons />
        <ModeSwitcher mode={mode} onChange={handleModeChange} />
      </div>
    )

    return (
      <ReactFlowProvider>
        <SidebarLayout
          title={`Workflow Editor${workflowVersion ? ` (${workflowVersion.wf_version_id})` : ""}`}
          right={HeaderRight}
          showToggle={true}
        >
          <AppContextMenu>
            <Workflow workflowVersionId={workflowVersion?.wf_version_id} />
          </AppContextMenu>
        </SidebarLayout>
      </ReactFlowProvider>
    )
  }

  // JSON mode
  const JsonHeaderRight = (
    <div className="flex items-center space-x-2">
      <ModeSwitcher mode={mode} onChange={handleModeChange} />
    </div>
  )

  if (mode === "json") {
    return (
      <ReactFlowProvider>
        <SidebarLayout
          title={`Workflow Editor${workflowVersion ? ` (${workflowVersion.wf_version_id})` : ""}`}
          right={JsonHeaderRight}
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

  // Eval mode
  const EvalHeaderRight = (
    <div className="flex items-center space-x-2">
      <ModeSwitcher mode={mode} onChange={handleModeChange} />
    </div>
  )

  if (mode === "eval") {
    return (
      <ReactFlowProvider>
        <SidebarLayout
          title={`Workflow Editor${workflowVersion ? ` (${workflowVersion.wf_version_id})` : ""}`}
          right={EvalHeaderRight}
          showToggle={false}
        >
          <div className="p-4">
            {/* Header Section */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-gray-700 uppercase">
                    Goal
                  </label>
                  <span className="text-xs text-gray-500 italic">
                    (Define your evaluation objective)
                  </span>
                </div>
                <input
                  type="text"
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none placeholder:text-gray-400"
                  placeholder="e.g., 'Evaluate customer service responses' or 'Test data analysis accuracy'"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                />
                
                {/* Dataset Selection */}
                <div className="flex items-center gap-2 mt-2">
                  <label className="text-sm font-semibold text-gray-700 uppercase">
                    Dataset
                  </label>
                  <span className="text-xs text-gray-500 italic">
                    (Load test cases from database)
                  </span>
                </div>
                <div className="w-full max-w-xs">
                  <DatasetSelector 
                    selectedDatasetId={datasetId}
                    onSelect={loadDataset}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
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
                  className="bg-black hover:bg-gray-800"
                >
                  Run All ({cases.length})
                </Button>
              </div>
            </div>

            {/* Test Cases Section */}
            <div className="bg-white rounded border border-gray-200">
              <WorkflowIOTable
                ios={cases}
                onRun={async (row) => {
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
                >
                  + Add Test
                </Button>
                <div className="text-xs text-gray-400">
                  Tab = Next · Enter = Run
                </div>
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
