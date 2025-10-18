"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AgentStep } from "@core/messages/pipeline/AgentStep.types"
import { getRuntimeEnabledModels, getRuntimeEnabledProviders } from "@lucky/models"
import { ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION, ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION } from "@lucky/tools"
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Code2,
  Coins,
  Flame,
  Loader2,
  Play,
  Settings,
  Zap,
} from "lucide-react"
import { useMemo, useRef, useState } from "react"

interface PipelineTestRequest {
  systemPrompt: string
  provider: string
  modelName: string
  maxSteps?: number
  codeTools: string[]
  mcpTools: string[]
  message: string
  toolStrategy: "v2" | "v3" | "auto"
  mainGoal?: string
  randomId?: string
}

interface PipelineTestResult {
  type: string
  content: string
  agentSteps: AgentStep[]
  cost: number
  timeMs: number
  summary?: string
}

interface PipelineTestResponse {
  success: boolean
  randomId?: string
  result?: PipelineTestResult
  error?: string
}

// Get available tools from registry
const AVAILABLE_CODE_TOOLS = Object.keys(ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION)
const AVAILABLE_MCP_TOOLS = Object.keys(ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION)

export function PipelineTester() {
  // Get active providers and models from catalog (source of truth)
  const activeProviders = useMemo(() => getRuntimeEnabledProviders(), [])
  const allActiveModels = useMemo(() => getRuntimeEnabledModels(), [])

  const [config, setConfig] = useState<PipelineTestRequest>({
    systemPrompt: "You are a helpful assistant. Use the available tools to answer questions accurately.",
    provider: "openrouter",
    modelName: "", // Will be set to first runtime-enabled model by useMemo below
    maxSteps: 3,
    codeTools: ["todoRead", "todoWrite"],
    mcpTools: [],
    message: "Create a todo list with 3 tasks for building a web app",
    toolStrategy: "auto",
    mainGoal: "Test pipeline execution",
  })

  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<PipelineTestResponse | null>(null)
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())
  const [streamEvents, setStreamEvents] = useState<any[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Filter models by selected provider
  const availableModels = useMemo(() => {
    return allActiveModels.filter(m => m.provider === config.provider)
  }, [allActiveModels, config.provider])

  // Set default model when provider changes
  const handleProviderChange = (provider: string) => {
    const modelsForProvider = allActiveModels.filter(m => m.provider === provider)
    setConfig({
      ...config,
      provider,
      modelName: modelsForProvider[0]?.id || "",
    })
  }

  // Set initial model
  useMemo(() => {
    if (!config.modelName && availableModels.length > 0) {
      setConfig(prev => ({ ...prev, modelName: availableModels[0].id }))
    }
  }, [availableModels, config.modelName])

  const handleRun = async () => {
    setIsRunning(true)
    setResult(null)
    setStreamEvents([])

    try {
      // Generate a short randomId on the client so we can open SSE first
      const randomId = Math.random().toString(16).slice(2, 10)

      // Close an existing stream if present
      if (eventSourceRef.current) {
        try {
          eventSourceRef.current.close()
        } catch {}
      }

      // Connect to SSE before kicking off the pipeline so events appear in real-time
      connectToStream(randomId)

      const response = await fetch("/api/dev/pipeline/invoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, randomId }),
      })

      // Handle non-OK responses
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // JSON parsing failed, use default message
        }
        setResult({
          success: false,
          error: errorMessage,
        })
        setIsRunning(false)
        return
      }

      const data = (await response.json()) as PipelineTestResponse
      setResult(data)
      setIsRunning(false)
    } catch (error) {
      console.error("Pipeline test fetch error:", error)
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
      setIsRunning(false)
    }
  }

  const connectToStream = (randomId: string) => {
    setIsStreaming(true)
    const eventSource = new EventSource(`/api/agents/${randomId}/stream?t=${Date.now()}`)
    eventSourceRef.current = eventSource

    eventSource.onmessage = event => {
      try {
        const data = JSON.parse(event.data)
        setStreamEvents(prev => [...prev, data])
      } catch (error) {
        console.error("Error parsing SSE event:", error)
      }
    }

    eventSource.onerror = () => {
      try {
        eventSource.close()
      } finally {
        setIsStreaming(false)
      }
    }

    // Auto-close after 5 minutes
    setTimeout(
      () => {
        try {
          eventSource.close()
        } finally {
          setIsStreaming(false)
        }
      },
      5 * 60 * 1000,
    )
  }

  const toggleStep = (index: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const toggleTool = (tool: string, type: "code" | "mcp") => {
    setConfig(prev => {
      const key = type === "code" ? "codeTools" : "mcpTools"
      const tools = prev[key]
      return {
        ...prev,
        [key]: tools.includes(tool) ? tools.filter(t => t !== tool) : [...tools, tool],
      }
    })
  }

  return (
    <div className="flex h-full bg-background">
      {/* Config Sidebar */}
      <div className="w-80 border-r border-border bg-sidebar/30 overflow-y-auto">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Pipeline Configuration</h2>
          <p className="text-xs text-muted-foreground mt-1">Test InvocationPipeline</p>
        </div>

        <div className="p-4 space-y-6">
          {/* System Prompt */}
          <div className="space-y-2">
            <label className="text-sm font-medium">System Prompt</label>
            <textarea
              value={config.systemPrompt}
              onChange={e => setConfig({ ...config, systemPrompt: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background resize-none"
            />
          </div>

          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Provider</label>
            <select
              value={config.provider}
              onChange={e => handleProviderChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
            >
              {activeProviders.map(provider => (
                <option key={provider} value={provider}>
                  {provider === "openai" ? "OpenAI (GATEWAY)" : provider.charAt(0).toUpperCase() + provider.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Model</label>
            <select
              value={config.modelName}
              onChange={e => setConfig({ ...config, modelName: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
              disabled={availableModels.length === 0}
            >
              {availableModels.length === 0 && <option value="">No active models</option>}
              {availableModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.model} (${model.input}/${model.output})
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {availableModels.length} model{availableModels.length !== 1 ? "s" : ""} available
            </p>
          </div>

          {/* maxSteps */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Max Steps</label>
            <input
              type="number"
              value={config.maxSteps || ""}
              onChange={e => setConfig({ ...config, maxSteps: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="Default (global config)"
              min={1}
              max={10}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
            />
            <p className="text-xs text-muted-foreground">Leave empty for global default (capped at 10)</p>
          </div>

          {/* Tool Strategy */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tool Strategy</label>
            <div className="grid grid-cols-3 gap-2">
              {(["auto", "v2", "v3"] as const).map(strategy => (
                <button
                  type="button"
                  key={strategy}
                  onClick={() => setConfig({ ...config, toolStrategy: strategy })}
                  className={cn(
                    "px-3 py-2 text-sm rounded border transition-colors",
                    config.toolStrategy === strategy
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {strategy === "auto" ? "Auto" : strategy.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Code Tools */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Code Tools</label>
            <div className="space-y-1">
              {AVAILABLE_CODE_TOOLS.map(tool => (
                <label
                  key={tool}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-2 rounded"
                  title={
                    ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION[
                      tool as keyof typeof ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION
                    ]
                  }
                >
                  <input
                    type="checkbox"
                    checked={config.codeTools.includes(tool)}
                    onChange={() => toggleTool(tool, "code")}
                    className="rounded"
                  />
                  <Code2 className="size-4 text-muted-foreground" />
                  <span>{tool}</span>
                </label>
              ))}
            </div>
          </div>

          {/* MCP Tools */}
          <div className="space-y-2">
            <label className="text-sm font-medium">MCP Tools</label>
            <div className="space-y-1">
              {AVAILABLE_MCP_TOOLS.map(tool => (
                <label
                  key={tool}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-2 rounded"
                  title={
                    ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION[tool as keyof typeof ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION]
                  }
                >
                  <input
                    type="checkbox"
                    checked={config.mcpTools.includes(tool)}
                    onChange={() => toggleTool(tool, "mcp")}
                    className="rounded"
                  />
                  <Zap className="size-4 text-muted-foreground" />
                  <span>{tool}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Main Goal */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Workflow Goal (optional)</label>
            <textarea
              value={config.mainGoal || ""}
              onChange={e => setConfig({ ...config, mainGoal: e.target.value })}
              rows={2}
              placeholder="Context about the overall task..."
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background resize-none"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Settings className="size-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-foreground">InvocationPipeline Tester</h2>
              <p className="text-sm text-muted-foreground">Test maxSteps and pipeline execution</p>
            </div>
          </div>
        </div>

        {/* Input Message */}
        <div className="border-b border-border px-8 py-6 bg-muted/30">
          <label className="text-sm font-medium mb-2 block">User Message</label>
          <textarea
            value={config.message}
            onChange={e => setConfig({ ...config, message: e.target.value })}
            rows={3}
            placeholder="Enter your message to the AI..."
            className="w-full px-3 py-2 text-sm border border-border rounded bg-background resize-none"
          />
          <div className="mt-4">
            <Button onClick={handleRun} disabled={isRunning || !config.message.trim()} className="gap-2">
              {isRunning ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              {isRunning ? "Running..." : "Run Pipeline"}
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {!result && !isRunning && (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center space-y-2">
                <Flame className="size-12 mx-auto opacity-50" />
                <p className="text-sm">Configure settings and run the pipeline</p>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* Status & Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="border border-border rounded-lg p-4 bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    {result.success ? (
                      <CheckCircle className="size-4 text-green-500" />
                    ) : (
                      <AlertCircle className="size-4 text-red-500" />
                    )}
                    <span className="text-sm font-medium">Status</span>
                  </div>
                  <p className={cn("text-lg font-semibold", result.success ? "text-green-500" : "text-red-500")}>
                    {result.success ? "Success" : "Error"}
                  </p>
                </div>

                {result.result && (
                  <>
                    <div className="border border-border rounded-lg p-4 bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="size-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Time</span>
                      </div>
                      <p className="text-lg font-semibold">{result.result.timeMs}ms</p>
                    </div>

                    <div className="border border-border rounded-lg p-4 bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <Coins className="size-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Cost</span>
                      </div>
                      <p className="text-lg font-semibold">${result.result.cost.toFixed(4)}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Stream Events */}
              {streamEvents.length > 0 && (
                <div className="border border-border rounded-lg p-4 bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="size-4 text-blue-500" />
                    <h3 className="text-sm font-semibold">Live Events</h3>
                    {isStreaming && <span className="text-xs text-blue-500">(streaming...)</span>}
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {streamEvents.map((event, idx) => (
                      <div key={idx} className="text-xs font-mono p-2 bg-muted/50 rounded border border-border">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-semibold",
                              event.type === "agent.start" && "bg-green-500/20 text-green-500",
                              event.type === "agent.end" && "bg-blue-500/20 text-blue-500",
                              event.type === "agent.error" && "bg-red-500/20 text-red-500",
                              event.type === "agent.tool.start" && "bg-yellow-500/20 text-yellow-500",
                              event.type === "agent.tool.end" && "bg-purple-500/20 text-purple-500",
                              event.type === "connected" && "bg-gray-500/20 text-gray-500",
                            )}
                          >
                            {event.type}
                          </span>
                          {event.nodeId && <span className="text-muted-foreground">node: {event.nodeId}</span>}
                        </div>
                        <div className="text-muted-foreground">{JSON.stringify(event, null, 2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {!result.success && result.error && (
                <div className="border border-red-500/20 rounded-lg p-4 bg-red-500/5">
                  <p className="text-sm text-red-500">
                    {typeof result.error === "string" ? result.error : JSON.stringify(result.error)}
                  </p>
                </div>
              )}

              {/* Final Response */}
              {result.result && (
                <div className="space-y-4">
                  <div className="border border-border rounded-lg p-4 bg-card">
                    <h3 className="text-sm font-semibold mb-3">Final Response</h3>
                    <p className="text-sm whitespace-pre-wrap">
                      {typeof result.result.content === "string"
                        ? result.result.content
                        : JSON.stringify(result.result.content, null, 2)}
                    </p>
                  </div>

                  {/* Agent Steps */}
                  {result.result.agentSteps && result.result.agentSteps.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        Agent Steps ({result.result.agentSteps.length})
                        {config.maxSteps && (
                          <span className="text-xs text-muted-foreground">(maxSteps: {config.maxSteps})</span>
                        )}
                      </h3>
                      <div className="space-y-2">
                        {result.result.agentSteps.map((step, index) => (
                          <div key={index} className="border border-border rounded-lg overflow-hidden bg-card">
                            <button
                              type="button"
                              onClick={() => toggleStep(index)}
                              className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    "p-1.5 rounded text-xs font-mono font-bold",
                                    step.type === "tool"
                                      ? "bg-blue-500/10 text-blue-500"
                                      : step.type === "text"
                                        ? "bg-green-500/10 text-green-500"
                                        : step.type === "error"
                                          ? "bg-red-500/10 text-red-500"
                                          : "bg-muted text-muted-foreground",
                                  )}
                                >
                                  {step.type.toUpperCase()}
                                </div>
                                <span className="text-sm font-medium">
                                  {step.type === "tool" ? `Tool: ${step.name}` : step.type}
                                </span>
                              </div>
                              {expandedSteps.has(index) ? (
                                <ChevronUp className="size-4" />
                              ) : (
                                <ChevronDown className="size-4" />
                              )}
                            </button>

                            {expandedSteps.has(index) && (
                              <div className="px-4 py-3 border-t border-border bg-muted/30">
                                <pre className="text-xs font-mono whitespace-pre-wrap overflow-auto">
                                  {JSON.stringify(step, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
