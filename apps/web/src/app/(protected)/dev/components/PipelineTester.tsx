"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AgentStep } from "@core/messages/pipeline/AgentStep.types"
import { getActiveModels, getActiveProviders } from "@lucky/models/pricing/catalog"
import type { ModelEntry } from "@lucky/shared"
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
import { useMemo, useState } from "react"

interface PipelineTestRequest {
  systemPrompt: string
  provider: string
  modelName: string
  maxSteps?: number
  codeTools: string[]
  mcpTools: string[]
  message: string
  toolStrategy: "v2" | "v3"
  mainGoal?: string
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
  result?: PipelineTestResult
  error?: string
}

// Available code tools (common ones)
const AVAILABLE_CODE_TOOLS = ["math", "web-fetch", "web-search", "get-time", "file-read", "file-write", "file-list"]

// Available MCP tools (common ones)
const AVAILABLE_MCP_TOOLS = ["filesystem", "github", "brave-search", "fetch"]

export function PipelineTester() {
  // Get active providers and models from catalog (source of truth)
  const activeProviders = useMemo(() => getActiveProviders(), [])
  const allActiveModels = useMemo(() => getActiveModels(), [])

  const [config, setConfig] = useState<PipelineTestRequest>({
    systemPrompt: "You are a helpful assistant. Use the available tools to answer questions accurately.",
    provider: activeProviders[0] || "openai",
    modelName: "",
    maxSteps: 3,
    codeTools: ["math"],
    mcpTools: [],
    message: "What is 5 + 3?",
    toolStrategy: "v3",
    mainGoal: "Test pipeline execution",
  })

  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<PipelineTestResponse | null>(null)
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())

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
      modelName: modelsForProvider[0]?.model || "",
    })
  }

  // Set initial model
  useMemo(() => {
    if (!config.modelName && availableModels.length > 0) {
      setConfig(prev => ({ ...prev, modelName: availableModels[0].model }))
    }
  }, [availableModels, config.modelName])

  const handleRun = async () => {
    setIsRunning(true)
    setResult(null)

    try {
      const response = await fetch("/api/dev/pipeline/invoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
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
                <option key={model.id} value={model.model}>
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
            <div className="flex gap-2">
              {(["v2", "v3"] as const).map(strategy => (
                <button
                  type="button"
                  key={strategy}
                  onClick={() => setConfig({ ...config, toolStrategy: strategy })}
                  className={cn(
                    "flex-1 px-3 py-2 text-sm rounded border transition-colors",
                    config.toolStrategy === strategy
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {strategy.toUpperCase()}
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
