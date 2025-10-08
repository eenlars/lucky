"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Plus,
  Save,
  Server,
  Trash2,
  X,
} from "lucide-react"
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
  const [editingServer, setEditingServer] = useState<string | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")

  // Load config on mount
  useEffect(() => {
    setConfig(getStoredMCPConfig())
  }, [])

  const handleSave = () => {
    setSaveStatus("saving")
    saveMCPConfig(config)
    setTimeout(() => {
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    }, 300)
  }

  const handleAddServer = () => {
    setIsCreatingNew(true)
    setEditingServer(null)
  }

  const handleDeleteServer = (serverName: string) => {
    const newConfig = { ...config }
    delete newConfig.mcpServers[serverName]
    setConfig(newConfig)
    saveMCPConfig(newConfig)
  }

  const serverNames = Object.keys(config.mcpServers)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">MCP Servers</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure Model Context Protocol servers for your workflows
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === "saved" && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle2 className="size-4" />
              Saved
            </span>
          )}
          <Button onClick={handleSave} variant="outline" size="sm" disabled={saveStatus === "saving"}>
            <Save className="size-4 mr-2" />
            {saveStatus === "saving" ? "Saving..." : "Save Config"}
          </Button>
          <Button onClick={handleAddServer} size="sm">
            <Plus className="size-4 mr-2" />
            Add Server
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="size-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              MCP servers extend your workflows with external tools and capabilities. Configure servers following the{" "}
              <a
                href="https://modelcontextprotocol.io"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-700"
              >
                MCP standard
              </a>
              .
            </p>
            <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <p>• Each server requires a command (executable path) and arguments</p>
              <p>• Environment variables can be set per-server for configuration</p>
              <p>• Configuration is stored locally in your browser</p>
            </div>
          </div>
        </div>
      </div>

      {/* New Server Form */}
      {isCreatingNew && (
        <MCPServerForm
          onSave={(name, serverConfig) => {
            const newConfig = {
              ...config,
              mcpServers: {
                ...config.mcpServers,
                [name]: serverConfig,
              },
            }
            setConfig(newConfig)
            saveMCPConfig(newConfig)
            setIsCreatingNew(false)
          }}
          onCancel={() => setIsCreatingNew(false)}
        />
      )}

      {/* Server List */}
      {serverNames.length === 0 && !isCreatingNew ? (
        <Card className="p-12">
          <div className="text-center">
            <Server className="size-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No MCP servers configured</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Add your first MCP server to extend your workflow capabilities
            </p>
            <Button onClick={handleAddServer} size="sm">
              <Plus className="size-4 mr-2" />
              Add MCP Server
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {serverNames.map(serverName => (
            <MCPServerCard
              key={serverName}
              serverName={serverName}
              serverConfig={config.mcpServers[serverName]}
              isEditing={editingServer === serverName}
              onEdit={() => setEditingServer(serverName)}
              onSave={updatedConfig => {
                const newConfig = {
                  ...config,
                  mcpServers: {
                    ...config.mcpServers,
                    [serverName]: updatedConfig,
                  },
                }
                setConfig(newConfig)
                saveMCPConfig(newConfig)
                setEditingServer(null)
              }}
              onDelete={() => handleDeleteServer(serverName)}
              onCancel={() => setEditingServer(null)}
            />
          ))}
        </div>
      )}

      {/* Export/Import Section */}
      <Card className="p-6">
        <h3 className="text-sm font-medium text-foreground mb-3">Configuration JSON</h3>
        <div className="relative">
          <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-64 font-mono">
            {JSON.stringify(config, null, 2)}
          </pre>
          <Button
            size="sm"
            variant="outline"
            className="absolute top-2 right-2"
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(config, null, 2))
            }}
          >
            Copy
          </Button>
        </div>
      </Card>
    </div>
  )
}

function MCPServerCard({
  serverName,
  serverConfig,
  isEditing,
  onEdit,
  onSave,
  onDelete,
  onCancel,
}: {
  serverName: string
  serverConfig: MCPServerConfig
  isEditing: boolean
  onEdit: () => void
  onSave: (config: MCPServerConfig) => void
  onDelete: () => void
  onCancel: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  if (isEditing) {
    return (
      <MCPServerForm
        initialName={serverName}
        initialConfig={serverConfig}
        onSave={(_, config) => onSave(config)}
        onCancel={onCancel}
        isEditing
      />
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              </button>
              <div>
                <h3 className="text-base font-semibold text-foreground">{serverName}</h3>
                <code className="text-xs text-muted-foreground">{serverConfig.command}</code>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {serverConfig.args.length} args
            </Badge>
            {serverConfig.env && Object.keys(serverConfig.env).length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {Object.keys(serverConfig.env).length} env vars
              </Badge>
            )}
            <Button onClick={onEdit} variant="ghost" size="sm">
              Edit
            </Button>
            <Button onClick={onDelete} variant="ghost" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pl-9 space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Arguments</p>
              {serverConfig.args.length > 0 ? (
                <div className="space-y-1">
                  {serverConfig.args.map((arg, idx) => (
                    <code key={idx} className="block text-xs bg-muted px-2 py-1 rounded">
                      {arg}
                    </code>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No arguments</p>
              )}
            </div>

            {serverConfig.env && Object.keys(serverConfig.env).length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Environment Variables</p>
                <div className="space-y-1">
                  {Object.entries(serverConfig.env).map(([key, value]) => (
                    <div key={key} className="text-xs bg-muted px-2 py-1 rounded flex items-center gap-2">
                      <span className="font-mono text-foreground">{key}=</span>
                      <span className="font-mono text-muted-foreground truncate">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

function MCPServerForm({
  initialName,
  initialConfig,
  onSave,
  onCancel,
  isEditing = false,
}: {
  initialName?: string
  initialConfig?: MCPServerConfig
  onSave: (name: string, config: MCPServerConfig) => void
  onCancel: () => void
  isEditing?: boolean
}) {
  const [name, setName] = useState(initialName || "")
  const [command, setCommand] = useState(initialConfig?.command || "")
  const [args, setArgs] = useState<string[]>(initialConfig?.args || [])
  const [newArg, setNewArg] = useState("")
  const [env, setEnv] = useState<Record<string, string>>(initialConfig?.env || {})
  const [newEnvKey, setNewEnvKey] = useState("")
  const [newEnvValue, setNewEnvValue] = useState("")
  const [error, setError] = useState("")

  const handleAddArg = () => {
    if (newArg.trim()) {
      setArgs([...args, newArg.trim()])
      setNewArg("")
    }
  }

  const handleRemoveArg = (index: number) => {
    setArgs(args.filter((_, i) => i !== index))
  }

  const handleAddEnv = () => {
    if (newEnvKey.trim() && newEnvValue.trim()) {
      setEnv({ ...env, [newEnvKey.trim()]: newEnvValue.trim() })
      setNewEnvKey("")
      setNewEnvValue("")
    }
  }

  const handleRemoveEnv = (key: string) => {
    const newEnv = { ...env }
    delete newEnv[key]
    setEnv(newEnv)
  }

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Server name is required")
      return
    }
    if (!command.trim()) {
      setError("Command is required")
      return
    }

    const config: MCPServerConfig = {
      command: command.trim(),
      args,
      ...(Object.keys(env).length > 0 && { env }),
    }

    onSave(name.trim(), config)
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {isEditing ? `Edit Server: ${initialName}` : "New MCP Server"}
          </h3>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-3">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Server Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={isEditing}
            placeholder="e.g., tavily, firecrawl, playwright"
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Command <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={command}
            onChange={e => setCommand(e.target.value)}
            placeholder="e.g., npx, /usr/bin/python3, /path/to/server"
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">Full path to the executable or command</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Arguments</label>
          <div className="space-y-2">
            {args.map((arg, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted px-3 py-2 rounded">{arg}</code>
                <Button onClick={() => handleRemoveArg(idx)} variant="ghost" size="sm">
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newArg}
                onChange={e => setNewArg(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddArg()}
                placeholder="Add argument..."
                className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
              />
              <Button onClick={handleAddArg} variant="outline" size="sm">
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Environment Variables</label>
          <div className="space-y-2">
            {Object.entries(env).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted px-3 py-2 rounded">
                  {key}={value}
                </code>
                <Button onClick={() => handleRemoveEnv(key)} variant="ghost" size="sm">
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newEnvKey}
                onChange={e => setNewEnvKey(e.target.value)}
                placeholder="KEY"
                className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
              />
              <input
                type="text"
                value={newEnvValue}
                onChange={e => setNewEnvValue(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddEnv()}
                placeholder="value"
                className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
              />
              <Button onClick={handleAddEnv} variant="outline" size="sm">
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button onClick={onCancel} variant="outline" size="sm">
            Cancel
          </Button>
          <Button onClick={handleSubmit} size="sm">
            <Check className="size-4 mr-2" />
            {isEditing ? "Update Server" : "Add Server"}
          </Button>
        </div>
      </div>
    </Card>
  )
}
