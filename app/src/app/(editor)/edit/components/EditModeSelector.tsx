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

// Eval mode (IO table) + config helpers
import WorkflowIOTable, { type WorkflowIO } from "@/components/WorkflowIOTable"
import { toWorkflowConfig } from "@core/workflow/schema/workflow.types"
import { loadFromDSLClient } from "@core/workflow/setup/WorkflowLoader.client"

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

  // Eval mode state
  const [ios, setIos] = useState<WorkflowIO[]>([])
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [resultsById, setResultsById] = useState<
    Record<string, { fitness?: any; output?: string; error?: string }>
  >({})

  const createIO = useCallback(
    async (payload: { input: string; expected: string }) => {
      const id =
        typeof crypto !== "undefined" &&
        typeof (crypto as any).randomUUID === "function"
          ? crypto.randomUUID()
          : "io_" + Math.random().toString(36).slice(2)
      setIos((prev) => [
        ...prev,
        { id, input: payload.input, expected: payload.expected },
      ])
    },
    []
  )

  const updateIO = useCallback(
    async (id: string, patch: Partial<WorkflowIO>) => {
      setIos((prev) =>
        prev.map((x) => (x.id === id ? ({ ...x, ...patch } as WorkflowIO) : x))
      )
    },
    []
  )

  const deleteIO = useCallback(async (id: string) => {
    setIos((prev) => prev.filter((x) => x.id !== id))
    setResultsById((m) => {
      const { [id]: _drop, ...rest } = m
      return rest
    })
    setBusyIds((s) => {
      const next = new Set(s)
      next.delete(id)
      return next
    })
  }, [])

  const runIO = useCallback(
    async (io: WorkflowIO) => {
      setBusyIds((s) => new Set(s).add(io.id))
      try {
        // Always export latest edits (graph or json) to JSON
        const json = exportToJSON()
        const parsed = JSON.parse(json)
        const cfgMaybe = toWorkflowConfig(parsed)
        if (!cfgMaybe) throw new Error("Invalid workflow config")
        const cfg = await loadFromDSLClient(cfgMaybe)

        const resp = await fetch("/api/workflow/run-many", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dslConfig: cfg,
            cases: [{ workflowInput: io.input, workflowOutput: io.expected }],
          }),
        })

        const out = await resp.json()
        const first = out.results?.[0]
        if (first?.success) {
          setResultsById((m) => ({
            ...m,
            [io.id]: {
              fitness: first?.data?.[0]?.fitness,
              output: first?.data?.[0]?.finalWorkflowOutputs,
            },
          }))
        } else {
          setResultsById((m) => ({
            ...m,
            [io.id]: { error: first?.error || "Failed" },
          }))
        }
      } catch (e: any) {
        setResultsById((m) => ({
          ...m,
          [io.id]: { error: e?.message || "Error" },
        }))
      } finally {
        setBusyIds((s) => {
          const next = new Set(s)
          next.delete(io.id)
          return next
        })
      }
    },
    [exportToJSON]
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
          <button
            onClick={() => handleModeChange("eval")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer text-gray-600 hover:text-gray-900 hover:bg-gray-50`}
          >
            🧪 Eval Mode
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
        <button
          onClick={() => handleModeChange("eval")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer text-gray-600 hover:text-gray-900 hover:bg-gray-50`}
        >
          🧪 Eval Mode
        </button>
      </div>
    </div>
  )

  if (mode === "json") {
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

  // Eval mode
  const EvalHeaderRight = (
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
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer text-gray-600 hover:text-gray-900 hover:bg-gray-50`}
        >
          📝 JSON Mode
        </button>
        <button
          onClick={() => handleModeChange("eval")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer bg-white text-gray-900 shadow-sm`}
        >
          🧪 Eval Mode
        </button>
      </div>
    </div>
  )

  if (mode === "eval") {
    return (
      <ReactFlowProvider>
        <SidebarLayout
          title={`Workflow Editor${workflowVersion ? ` (${workflowVersion.wf_version_id})` : ""}`}
          right={EvalHeaderRight}
        >
          <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Workflow IO (editable)</h2>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 border rounded hover:bg-gray-50"
                  onClick={async () => {
                    for (const io of ios) await runIO(io)
                  }}
                  disabled={!ios.length}
                >
                  Run All
                </button>
              </div>
            </div>

            <WorkflowIOTable
              ios={ios}
              resultsById={resultsById}
              busyIds={busyIds}
              onCreate={createIO}
              onUpdate={updateIO}
              onDelete={deleteIO}
              onRun={runIO}
            />
          </div>
        </SidebarLayout>
      </ReactFlowProvider>
    )
  }

  // Fallback (should not hit)
  return null
}
