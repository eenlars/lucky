"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { AlertCircle, Check, ChevronDown, ChevronRight, Copy, Plus, Server, Trash2, X } from "lucide-react"
import { useEffect, useState } from "react"

export interface MCPServerConfig {
  command: string
  args: string[]
  env?: Record<string, string>
}

export interface MCPServers {
  mcpServers: Record<string, MCPServerConfig>
}

const MCP_STORAGE_KEY = "mcp_servers_config"

function getStoredMCPConfig(): MCPServers {
  if (typeof window === "undefined") return { mcpServers: {} }

  try {
    const stored = localStorage.getItem(MCP_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Failed to load MCP config:", error)
  }

  return { mcpServers: {} }
}

function saveMCPConfig(config: MCPServers): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(MCP_STORAGE_KEY, JSON.stringify(config, null, 2))
  } catch (error) {
    console.error("Failed to save MCP config:", error)
  }
}

export function MCPServersConfig() {
  const [config, setConfig] = useState<MCPServers>({ mcpServers: {} })
  const [jsonInput, setJsonInput] = useState("")
  const [jsonError, setJsonError] = useState("")
  const [jsonSuccess, setJsonSuccess] = useState(false)
  const [showManualAdd, setShowManualAdd] = useState(false)

  // Load config on mount
  useEffect(() => {
    const loaded = getStoredMCPConfig()
    setConfig(loaded)
    setJsonInput(JSON.stringify(loaded, null, 2))
  }, [])

  const handleJsonPaste = (value: string) => {
    setJsonInput(value)
    setJsonError("")
    setJsonSuccess(false)

    if (!value.trim()) return

    try {
      const parsed = JSON.parse(value)

      // Validate structure
      if (!parsed.mcpServers || typeof parsed.mcpServers !== "object") {
        setJsonError("Invalid format. Must have 'mcpServers' object")
        return
      }

      // Validate each server
      for (const [name, serverConfig] of Object.entries(parsed.mcpServers)) {
        const server = serverConfig as any
        if (!server.command || !Array.isArray(server.args)) {
          setJsonError(`Server '${name}': missing command or args array`)
          return
        }
      }

      // Valid! Apply it
      setConfig(parsed)
      saveMCPConfig(parsed)
      setJsonSuccess(true)
      setTimeout(() => setJsonSuccess(false), 2000)
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : "Invalid JSON")
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2))
  }

  const handleDeleteServer = (serverName: string) => {
    const newConfig = { ...config }
    delete newConfig.mcpServers[serverName]
    setConfig(newConfig)
    saveMCPConfig(newConfig)
    setJsonInput(JSON.stringify(newConfig, null, 2))
  }

  const handleAddServer = (name: string, serverConfig: MCPServerConfig) => {
    const newConfig = {
      ...config,
      mcpServers: {
        ...config.mcpServers,
        [name]: serverConfig,
      },
    }
    setConfig(newConfig)
    saveMCPConfig(newConfig)
    setJsonInput(JSON.stringify(newConfig, null, 2))
    setShowManualAdd(false)
  }

  const serverNames = Object.keys(config.mcpServers)
  const hasServers = serverNames.length > 0

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Primary: JSON Paste Interface */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-light text-foreground">MCP Configuration</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Paste your MCP servers JSON or add them manually
            </p>
          </div>
          <a
            href="https://modelcontextprotocol.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            MCP Docs →
          </a>
        </div>

        <div className="relative">
          <textarea
            value={jsonInput}
            onChange={e => handleJsonPaste(e.target.value)}
            placeholder={`{\n  "mcpServers": {\n    "tavily": {\n      "command": "npx",\n      "args": ["-y", "@tavily/mcp-server"],\n      "env": { "TAVILY_API_KEY": "\${TAVILY_API_KEY}" }\n    }\n  }\n}`}
            className={cn(
              "w-full h-64 px-4 py-3 rounded-lg border font-mono text-xs",
              "bg-background focus:outline-none focus:ring-1 transition-all resize-none",
              jsonError && "border-red-500 focus:ring-red-500",
              jsonSuccess && "border-green-500 focus:ring-green-500",
              !jsonError && !jsonSuccess && "border-border focus:ring-primary/50",
            )}
          />
          <Button
            onClick={handleCopy}
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-7 px-2 text-xs"
          >
            <Copy className="size-3 mr-1" />
            Copy
          </Button>
        </div>

        {/* Feedback */}
        {jsonError && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
            <AlertCircle className="size-4 flex-shrink-0 mt-0.5" />
            <span>{jsonError}</span>
          </div>
        )}

        {jsonSuccess && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
            <Check className="size-4 flex-shrink-0" />
            <span>Configuration loaded successfully</span>
          </div>
        )}
      </div>

      {/* Secondary: Server List */}
      {hasServers && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              {serverNames.length} {serverNames.length === 1 ? "server" : "servers"} configured
            </h3>
            <Button onClick={() => setShowManualAdd(true)} variant="ghost" size="sm" className="h-7 text-xs">
              <Plus className="size-3 mr-1" />
              Add server
            </Button>
          </div>

          <div className="space-y-2">
            {serverNames.map(serverName => (
              <MCPServerRow
                key={serverName}
                serverName={serverName}
                serverConfig={config.mcpServers[serverName]}
                onDelete={() => handleDeleteServer(serverName)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasServers && !showManualAdd && (
        <Card className="p-8">
          <div className="text-center space-y-3">
            <Server className="size-8 text-muted-foreground mx-auto" />
            <div>
              <p className="text-sm text-foreground">No servers configured</p>
              <p className="text-xs text-muted-foreground mt-1">Paste JSON above or add manually</p>
            </div>
            <Button onClick={() => setShowManualAdd(true)} variant="outline" size="sm">
              Add your first server
            </Button>
          </div>
        </Card>
      )}

      {/* Manual Add Form */}
      {showManualAdd && (
        <QuickAddForm
          onSave={handleAddServer}
          onCancel={() => setShowManualAdd(false)}
          existingNames={serverNames}
        />
      )}
    </div>
  )
}

function MCPServerRow({
  serverName,
  serverConfig,
  onDelete,
}: {
  serverName: string
  serverConfig: MCPServerConfig
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="group border border-border rounded-lg overflow-hidden hover:border-muted-foreground/30 transition-colors">
      <div className="flex items-center justify-between p-3 bg-background">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          {expanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-foreground">{serverName}</span>
              <code className="text-xs text-muted-foreground truncate">{serverConfig.command}</code>
            </div>
          </div>
        </button>
        <Button
          onClick={onDelete}
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="size-3 text-muted-foreground hover:text-red-600" />
        </Button>
      </div>

      {expanded && (
        <div className="border-t border-border bg-muted/30 p-3 space-y-2">
          {serverConfig.args.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Arguments</p>
              <div className="space-y-1">
                {serverConfig.args.map((arg, idx) => (
                  <code key={idx} className="block text-xs bg-background px-2 py-1 rounded text-foreground">
                    {arg}
                  </code>
                ))}
              </div>
            </div>
          )}

          {serverConfig.env && Object.keys(serverConfig.env).length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Environment</p>
              <div className="space-y-1">
                {Object.entries(serverConfig.env).map(([key, value]) => (
                  <code key={key} className="block text-xs bg-background px-2 py-1 rounded text-foreground">
                    {key}={value}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function QuickAddForm({
  onSave,
  onCancel,
  existingNames,
}: {
  onSave: (name: string, config: MCPServerConfig) => void
  onCancel: () => void
  existingNames: string[]
}) {
  const [name, setName] = useState("")
  const [command, setCommand] = useState("")
  const [argsText, setArgsText] = useState("")
  const [envText, setEnvText] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = () => {
    setError("")

    if (!name.trim()) {
      setError("Server name required")
      return
    }

    if (existingNames.includes(name.trim())) {
      setError("Server name already exists")
      return
    }

    if (!command.trim()) {
      setError("Command required")
      return
    }

    // Parse args (one per line)
    const args = argsText
      .split("\n")
      .map(a => a.trim())
      .filter(Boolean)

    // Parse env (KEY=value format, one per line)
    const env: Record<string, string> = {}
    if (envText.trim()) {
      const lines = envText.split("\n").filter(l => l.trim())
      for (const line of lines) {
        const [key, ...valueParts] = line.split("=")
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join("=").trim()
        }
      }
    }

    const config: MCPServerConfig = {
      command: command.trim(),
      args,
      ...(Object.keys(env).length > 0 && { env }),
    }

    onSave(name.trim(), config)
  }

  return (
    <Card className="p-4 space-y-3 border-primary/50">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Add Server</h3>
        <Button onClick={onCancel} variant="ghost" size="sm" className="h-6 w-6 p-0">
          <X className="size-4" />
        </Button>
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded">{error}</div>
      )}

      <div className="space-y-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Server name (e.g., tavily)"
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
        />

        <input
          type="text"
          value={command}
          onChange={e => setCommand(e.target.value)}
          placeholder="Command (e.g., npx or /usr/bin/python3)"
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
        />

        <textarea
          value={argsText}
          onChange={e => setArgsText(e.target.value)}
          placeholder="Arguments (one per line)&#10;-y&#10;@tavily/mcp-server"
          rows={3}
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
        />

        <textarea
          value={envText}
          onChange={e => setEnvText(e.target.value)}
          placeholder="Environment variables (KEY=value, one per line)&#10;TAVILY_API_KEY=${TAVILY_API_KEY}"
          rows={2}
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
        />
      </div>

      <div className="flex items-center gap-2 justify-end pt-2">
        <Button onClick={onCancel} variant="ghost" size="sm">
          Cancel
        </Button>
        <Button onClick={handleSubmit} size="sm">
          Add Server
        </Button>
      </div>
    </Card>
  )
}
