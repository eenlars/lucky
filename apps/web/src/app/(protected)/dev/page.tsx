"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useConnectorsUIStore } from "@/stores/connectors-ui-store"
import { useEvolutionRunsStore } from "@/stores/evolution-runs-store"
import { useEvolutionUIStore } from "@/stores/evolution-ui-store"
import { useMCPConfigStore } from "@/stores/mcp-config-store"
import { useModelPreferencesStore } from "@/stores/model-preferences-store"
import { useProfileStore } from "@/stores/profile.store"
import { useRunConfigStore } from "@/stores/run-config-store"
import { useWorkflowStore } from "@/stores/workflow-store"
import {
  AlertCircle,
  Braces,
  Check,
  CheckCircle,
  Code2,
  Copy,
  Database,
  History,
  Layout,
  List,
  Network,
  Play,
  Plug,
  RefreshCw,
  Settings,
  TrendingUp,
  User,
  Zap,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface StoreInspector {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  useStore: () => unknown
  getSnapshot: () => unknown
}

type ViewMode = "state" | "actions" | "raw"

interface ActionMetadata {
  name: string
  params: string[]
  isAsync: boolean
  signature: string
  fn: (...args: unknown[]) => unknown
}

interface ProcessedStoreData {
  state: Record<string, unknown>
  actions: ActionMetadata[]
  raw: Record<string, unknown>
}

interface ActionExecution {
  id: string
  actionName: string
  params: unknown[]
  timestamp: Date
  status: "success" | "error"
  result?: unknown
  error?: string
}

export default function DevPage() {
  const router = useRouter()
  const [selectedStore, setSelectedStore] = useState<StoreInspector | null>(null)
  const [processedData, setProcessedData] = useState<ProcessedStoreData>({
    state: {},
    actions: [],
    raw: {},
  })
  const [viewMode, setViewMode] = useState<ViewMode>("state")
  const [copied, setCopied] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [executions, setExecutions] = useState<ActionExecution[]>([])
  const [actionInputs, setActionInputs] = useState<Record<string, string>>({})
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set())

  // Only allow in development
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      router.push("/")
    }
  }, [router])

  // Define all stores to inspect
  const stores: StoreInspector[] = [
    {
      id: "workflow",
      name: "Workflow Store",
      description: "Workflows & state",
      icon: <Network className="size-4" />,
      useStore: useWorkflowStore,
      getSnapshot: () => useWorkflowStore.getState(),
    },
    {
      id: "model-preferences",
      name: "Model Preferences",
      description: "Model settings",
      icon: <Settings className="size-4" />,
      useStore: useModelPreferencesStore,
      getSnapshot: () => useModelPreferencesStore.getState(),
    },
    {
      id: "run-config",
      name: "Run Config",
      description: "Execution config",
      icon: <Play className="size-4" />,
      useStore: useRunConfigStore,
      getSnapshot: () => useRunConfigStore.getState(),
    },
    {
      id: "profile",
      name: "Profile Store",
      description: "User data",
      icon: <User className="size-4" />,
      useStore: useProfileStore,
      getSnapshot: () => useProfileStore.getState(),
    },
    {
      id: "mcp-config",
      name: "MCP Config",
      description: "Tool config",
      icon: <Plug className="size-4" />,
      useStore: useMCPConfigStore,
      getSnapshot: () => useMCPConfigStore.getState(),
    },
    {
      id: "evolution-runs",
      name: "Evolution Runs",
      description: "Run history",
      icon: <History className="size-4" />,
      useStore: useEvolutionRunsStore,
      getSnapshot: () => useEvolutionRunsStore.getState(),
    },
    {
      id: "evolution-ui",
      name: "Evolution UI",
      description: "UI state",
      icon: <TrendingUp className="size-4" />,
      useStore: useEvolutionUIStore,
      getSnapshot: () => useEvolutionUIStore.getState(),
    },
    {
      id: "connectors-ui",
      name: "Connectors UI",
      description: "UI state",
      icon: <Layout className="size-4" />,
      useStore: useConnectorsUIStore,
      getSnapshot: () => useConnectorsUIStore.getState(),
    },
  ]

  // Set initial store
  useEffect(() => {
    if (!selectedStore && stores.length > 0) {
      setSelectedStore(stores[0])
    }
  }, [selectedStore, stores])

  // Process store data - separate state from actions
  const processStoreData = (data: unknown): ProcessedStoreData => {
    if (!data || typeof data !== "object") {
      return { state: {}, actions: [], raw: {} }
    }

    const state: Record<string, unknown> = {}
    const actions: ActionMetadata[] = []
    const raw = data as Record<string, unknown>

    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === "function") {
        // Extract function name and signature
        const funcStr = value.toString()
        const isAsync = funcStr.startsWith("async")
        const paramMatch = funcStr.match(/\(([^)]*)\)/)?.[1] || ""
        const params = paramMatch
          .split(",")
          .map(p => p.trim())
          .filter(Boolean)

        actions.push({
          name: key,
          params,
          isAsync,
          signature: `${key}(${paramMatch})${isAsync ? " [async]" : ""}`,
          fn: value as (...args: unknown[]) => unknown,
        })
      } else {
        // Convert Sets and Maps for display
        if (value instanceof Set) {
          state[key] = Array.from(value)
        } else if (value instanceof Map) {
          state[key] = Object.fromEntries(value)
        } else {
          state[key] = value
        }
      }
    }

    return { state, actions, raw }
  }

  // Update store data when selection changes or auto-refresh is enabled
  useEffect(() => {
    if (!selectedStore) return

    const updateData = () => {
      try {
        const data = selectedStore.getSnapshot()
        const processed = processStoreData(data)
        setProcessedData(processed)
      } catch (error) {
        console.error("Error processing store data:", error)
      }
    }

    updateData()

    if (autoRefresh) {
      const interval = setInterval(updateData, 500)
      return () => clearInterval(interval)
    }
  }, [selectedStore, autoRefresh])

  const isValidJSON = (str: string): boolean => {
    if (!str.trim()) return true
    try {
      JSON.parse(str)
      return true
    } catch {
      return false
    }
  }

  const executeAction = async (action: ActionMetadata) => {
    const inputKey = action.name
    const inputValue = actionInputs[inputKey] || ""

    let params: unknown[] = []
    if (inputValue.trim()) {
      try {
        // Try to parse as JSON for complex objects/arrays
        params = JSON.parse(`[${inputValue}]`)
      } catch {
        // Fallback to comma-separated values
        params = inputValue.split(",").map(v => {
          const trimmed = v.trim()
          // Try to parse each value
          try {
            return JSON.parse(trimmed)
          } catch {
            return trimmed
          }
        })
      }
    }

    const execution: ActionExecution = {
      id: `${Date.now()}-${Math.random()}`,
      actionName: action.name,
      params,
      timestamp: new Date(),
      status: "success",
    }

    try {
      const result = await action.fn(...params)
      execution.result = result
      setExecutions(prev => [execution, ...prev].slice(0, 50)) // Keep last 50
    } catch (error) {
      execution.status = "error"
      execution.error = error instanceof Error ? error.message : String(error)
      setExecutions(prev => [execution, ...prev].slice(0, 50))
    }
  }

  const getCurrentViewData = () => {
    switch (viewMode) {
      case "state":
        return JSON.stringify(processedData.state, null, 2)
      case "actions":
        return processedData.actions.map(a => a.signature).join("\n")
      case "raw":
        return JSON.stringify(
          processedData.raw,
          (key, value) => {
            if (value instanceof Set) return Array.from(value)
            if (value instanceof Map) return Object.fromEntries(value)
            if (typeof value === "function") return `[Function: ${key}]`
            return value
          },
          2,
        )
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(getCurrentViewData())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRefresh = () => {
    if (selectedStore) {
      const data = selectedStore.getSnapshot()
      const processed = processStoreData(data)
      setProcessedData(processed)
    }
  }

  if (process.env.NODE_ENV !== "development") {
    return null
  }

  const tabs = [
    { id: "state" as ViewMode, label: "State", icon: Database, count: Object.keys(processedData.state).length },
    { id: "actions" as ViewMode, label: "Actions", icon: Code2, count: processedData.actions.length },
    { id: "raw" as ViewMode, label: "Raw", icon: List, count: null },
  ]

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-sidebar/30">
        <div className="p-6 border-b border-border">
          <h1 className="text-lg font-semibold text-foreground">Store Inspector</h1>
          <p className="text-xs text-muted-foreground mt-1">Development only</p>
        </div>

        <div className="p-3">
          {stores.map(store => (
            <button
              type="button"
              key={store.id}
              onClick={() => setSelectedStore(store)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer",
                selectedStore?.id === store.id
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar/50",
              )}
            >
              <div
                className={cn(
                  "p-1.5 rounded-md",
                  selectedStore?.id === store.id ? "bg-primary/10 text-primary" : "bg-muted/50",
                )}
              >
                {store.icon}
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium">{store.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">{store.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        {selectedStore && (
          <div className="border-b border-border px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">{selectedStore.icon}</div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-foreground">{selectedStore.name}</h2>
                <p className="text-sm text-muted-foreground">{selectedStore.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={cn(autoRefresh && "bg-primary/10")}
                >
                  <RefreshCw className={cn("size-4", autoRefresh && "animate-spin")} />
                  {autoRefresh ? "Auto" : "Manual"}
                </Button>
                {!autoRefresh && (
                  <Button variant="outline" size="sm" onClick={handleRefresh}>
                    <RefreshCw className="size-4" />
                    Refresh
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-border bg-muted/10">
          <div className="flex px-6">
            {tabs.map(tab => (
              <button
                type="button"
                key={tab.id}
                onClick={() => setViewMode(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative",
                  viewMode === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <tab.icon className="size-4" />
                {tab.label}
                {tab.count !== null && (
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded text-xs font-medium",
                      viewMode === tab.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {tab.count}
                  </span>
                )}
                {viewMode === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-background flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Braces className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium capitalize">{viewMode}</span>
              {autoRefresh && <span className="text-xs text-muted-foreground">(updates every 500ms)</span>}
            </div>
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied!" : "Copy JSON"}
            </Button>
          </div>

          <div className="flex-1 p-6 overflow-auto">
            {viewMode === "actions" ? (
              <div className="space-y-4">
                {processedData.actions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No actions found</p>
                ) : (
                  <>
                    {processedData.actions.map(action => (
                      <div key={action.name} className="border border-border rounded-lg overflow-hidden bg-card">
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedActions(prev => {
                              const next = new Set(prev)
                              if (next.has(action.name)) {
                                next.delete(action.name)
                              } else {
                                next.add(action.name)
                              }
                              return next
                            })
                          }}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "p-1.5 rounded",
                                action.isAsync ? "bg-blue-500/10 text-blue-500" : "bg-primary/10 text-primary",
                              )}
                            >
                              <Zap className="size-4" />
                            </div>
                            <div className="text-left">
                              <div className="font-mono text-sm font-medium">{action.signature}</div>
                              {action.params.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {action.params.length} parameter{action.params.length !== 1 ? "s" : ""}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className={cn("transition-transform", expandedActions.has(action.name) && "rotate-180")}>
                            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>

                        {expandedActions.has(action.name) && (
                          <div className="px-4 py-3 border-t border-border bg-muted/30">
                            {action.params.length > 0 ? (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <label
                                    htmlFor={`action-${action.name}`}
                                    className="text-xs font-medium text-muted-foreground block"
                                  >
                                    Parameters (as JSON array)
                                  </label>
                                  <textarea
                                    id={`action-${action.name}`}
                                    value={actionInputs[action.name] || ""}
                                    onChange={e =>
                                      setActionInputs(prev => ({
                                        ...prev,
                                        [action.name]: e.target.value,
                                      }))
                                    }
                                    placeholder={action.params.map(p => `/* ${p} */ "value"`).join(", ")}
                                    rows={Math.min(action.params.length + 2, 6)}
                                    className={cn(
                                      "w-full px-3 py-2 text-sm border rounded bg-background font-mono resize-none",
                                      actionInputs[action.name] && !isValidJSON(`[${actionInputs[action.name]}]`)
                                        ? "border-red-500"
                                        : "border-border",
                                    )}
                                  />
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">
                                      Parameters:{" "}
                                      {action.params.map(p => (
                                        <code key={p} className="px-1 py-0.5 bg-muted rounded text-xs mx-0.5">
                                          {p}
                                        </code>
                                      ))}
                                    </p>
                                    <details className="text-xs text-muted-foreground">
                                      <summary className="cursor-pointer hover:text-foreground">Examples</summary>
                                      <div className="mt-2 space-y-1 pl-2 border-l-2 border-border">
                                        <div>
                                          String: <code className="bg-muted px-1 rounded">&quot;text&quot;</code>
                                        </div>
                                        <div>
                                          Number: <code className="bg-muted px-1 rounded">42</code>
                                        </div>
                                        <div>
                                          Boolean: <code className="bg-muted px-1 rounded">true</code>
                                        </div>
                                        <div>
                                          Object: <code className="bg-muted px-1 rounded">{`{key: "value"}`}</code>
                                        </div>
                                        <div>
                                          Array: <code className="bg-muted px-1 rounded">[1, 2, 3]</code>
                                        </div>
                                        <div>
                                          Multiple:{" "}
                                          <code className="bg-muted px-1 rounded">
                                            &quot;arg1&quot;, {"{opt: true}"}
                                          </code>
                                        </div>
                                      </div>
                                    </details>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => executeAction(action)}
                                  disabled={
                                    !!actionInputs[action.name] && !isValidJSON(`[${actionInputs[action.name]}]`)
                                  }
                                  className="gap-2"
                                >
                                  <Play className="size-3" />
                                  Execute
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" onClick={() => executeAction(action)} className="gap-2">
                                <Play className="size-3" />
                                Execute (no params)
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {executions.length > 0 && (
                      <div className="mt-8">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <History className="size-4" />
                          Execution History
                        </h3>
                        <div className="space-y-2">
                          {executions.map(exec => (
                            <div
                              key={exec.id}
                              className={cn(
                                "p-3 rounded border text-sm",
                                exec.status === "success"
                                  ? "bg-green-500/5 border-green-500/20"
                                  : "bg-red-500/5 border-red-500/20",
                              )}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  {exec.status === "success" ? (
                                    <CheckCircle className="size-4 text-green-500 flex-shrink-0" />
                                  ) : (
                                    <AlertCircle className="size-4 text-red-500 flex-shrink-0" />
                                  )}
                                  <span className="font-mono font-medium">{exec.actionName}</span>
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {exec.timestamp.toLocaleTimeString()}
                                </span>
                              </div>
                              {exec.params.length > 0 && (
                                <div className="text-xs text-muted-foreground mb-1">
                                  Params: {JSON.stringify(exec.params)}
                                </div>
                              )}
                              {exec.status === "error" && exec.error && (
                                <div className="text-xs text-red-500 mt-1">Error: {exec.error}</div>
                              )}
                              {exec.status === "success" && exec.result !== undefined && (
                                <details className="text-xs mt-2">
                                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                    View result
                                  </summary>
                                  <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
                                    {JSON.stringify(exec.result, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <pre className="font-mono text-sm text-foreground whitespace-pre-wrap">{getCurrentViewData()}</pre>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
