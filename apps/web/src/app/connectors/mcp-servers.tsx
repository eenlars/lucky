"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { AlertCircle, Check, ChevronDown, FileJson, Trash2, X } from "lucide-react"
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
  const [showJsonMode, setShowJsonMode] = useState(false)

  useEffect(() => {
    setConfig(getStoredMCPConfig())
  }, [])

  const handleDeleteServer = (serverName: string) => {
    const newConfig = { ...config }
    delete newConfig.mcpServers[serverName]
    setConfig(newConfig)
    saveMCPConfig(newConfig)
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
  }

  const serverNames = Object.keys(config.mcpServers)

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-light text-foreground">MCP Servers</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Connect to Model Context Protocol servers to extend your workflows with external tools
        </p>
      </div>

      {/* Add Server Form */}
      <AddServerForm onAdd={handleAddServer} existingNames={serverNames} />

      {/* Server List */}
      {serverNames.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {serverNames.length} {serverNames.length === 1 ? "server" : "servers"}
          </h3>
          <div className="space-y-2">
            {serverNames.map(name => (
              <ServerRow
                key={name}
                name={name}
                config={config.mcpServers[name]}
                onDelete={() => handleDeleteServer(name)}
              />
            ))}
          </div>
        </div>
      )}

      {/* JSON Mode Toggle */}
      <button
        type="button"
        onClick={() => setShowJsonMode(!showJsonMode)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <FileJson className="size-3" />
        {showJsonMode ? "Hide" : "Show"} JSON configuration
      </button>

      {/* JSON Editor */}
      {showJsonMode && <JsonEditor config={config} onUpdate={setConfig} />}
    </div>
  )
}

function AddServerForm({
  onAdd,
  existingNames,
}: {
  onAdd: (name: string, config: MCPServerConfig) => void
  existingNames: string[]
}) {
  const [serverType, setServerType] = useState<"remote" | "local">("remote")
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [authType, setAuthType] = useState<"none" | "apikey" | "oauth" | "custom">("none")
  const [apiKey, setApiKey] = useState("")
  const [command, setCommand] = useState("")
  const [args, setArgs] = useState("")
  const [envVars, setEnvVars] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = () => {
    setError("")

    if (!name.trim()) {
      setError("Name is required")
      return
    }

    if (existingNames.includes(name.trim())) {
      setError("A server with this name already exists")
      return
    }

    if (serverType === "remote") {
      if (!url.trim()) {
        setError("URL is required")
        return
      }
      // For remote, create a local proxy command that connects to the URL
      const serverConfig: MCPServerConfig = {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/mcp-proxy", url.trim()],
        env:
          authType === "apikey" && apiKey.trim()
            ? {
                MCP_API_KEY: apiKey.trim(),
              }
            : undefined,
      }
      onAdd(name.trim(), serverConfig)
    } else {
      if (!command.trim()) {
        setError("Command is required")
        return
      }

      const parsedArgs = args
        .split("\n")
        .map(a => a.trim())
        .filter(Boolean)

      const parsedEnv: Record<string, string> = {}
      if (envVars.trim()) {
        envVars.split("\n").forEach(line => {
          const [key, ...valueParts] = line.split("=")
          if (key && valueParts.length > 0) {
            parsedEnv[key.trim()] = valueParts.join("=").trim()
          }
        })
      }

      const serverConfig: MCPServerConfig = {
        command: command.trim(),
        args: parsedArgs,
        ...(Object.keys(parsedEnv).length > 0 && { env: parsedEnv }),
      }

      onAdd(name.trim(), serverConfig)
    }

    // Reset form
    setName("")
    setUrl("")
    setApiKey("")
    setCommand("")
    setArgs("")
    setEnvVars("")
    setAuthType("none")
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Server Type Toggle */}
        <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setServerType("remote")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-all",
              serverType === "remote"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Remote
          </button>
          <button
            type="button"
            onClick={() => setServerType("local")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-all",
              serverType === "local"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Local
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
            <AlertCircle className="size-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Name */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Tavily Search, Firecrawl, Playwright"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {serverType === "remote" ? (
          <>
            {/* Server URL */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Server URL</label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com/mcp"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
              />
            </div>

            {/* Authentication */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Authentication</label>
              <select
                value={authType}
                onChange={e => setAuthType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="none">None</option>
                <option value="apikey">API Key</option>
                <option value="oauth">OAuth</option>
                <option value="custom">Custom Headers</option>
              </select>
            </div>

            {/* API Key Input */}
            {authType === "apikey" && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                />
              </div>
            )}
          </>
        ) : (
          <>
            {/* Command */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Command</label>
              <input
                type="text"
                value={command}
                onChange={e => setCommand(e.target.value)}
                placeholder="e.g., npx, python3, node"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
              />
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Options</label>
              <textarea
                value={args}
                onChange={e => setArgs(e.target.value)}
                placeholder={"-y\n@modelcontextprotocol/server-tavily"}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono resize-none"
              />
            </div>

            {/* Environment variables */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Environment variables</label>
              <textarea
                value={envVars}
                onChange={e => setEnvVars(e.target.value)}
                placeholder={"TAVILY_API_KEY=${TAVILY_API_KEY}\nAPI_ENDPOINT=https://api.example.com"}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono resize-none"
              />
            </div>
          </>
        )}

        {/* Add Button */}
        <Button onClick={handleSubmit} className="w-full" size="lg">
          Add Server
        </Button>
      </div>
    </Card>
  )
}

function ServerRow({ name, config, onDelete }: { name: string; config: MCPServerConfig; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="group border border-border rounded-lg overflow-hidden hover:border-muted-foreground/30 transition-colors">
      <div className="flex items-center justify-between p-4 bg-background">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-3 flex-1 text-left"
        >
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", !expanded && "-rotate-90")} />
          <div>
            <div className="text-sm font-medium text-foreground">{name}</div>
            <code className="text-xs text-muted-foreground">{config.command}</code>
          </div>
        </button>
        <Button
          onClick={onDelete}
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="size-4 text-muted-foreground" />
        </Button>
      </div>

      {expanded && (
        <div className="border-t border-border bg-muted/20 p-4 space-y-3 text-xs">
          {config.args.length > 0 && (
            <div>
              <div className="font-medium text-muted-foreground mb-1">Options</div>
              {config.args.map((arg, i) => (
                <code key={i} className="block bg-background px-2 py-1 rounded mb-1 text-foreground">
                  {arg}
                </code>
              ))}
            </div>
          )}
          {config.env && Object.keys(config.env).length > 0 && (
            <div>
              <div className="font-medium text-muted-foreground mb-1">Environment</div>
              {Object.entries(config.env).map(([key, val]) => (
                <code key={key} className="block bg-background px-2 py-1 rounded mb-1 text-foreground">
                  {key}={val}
                </code>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function JsonEditor({ config, onUpdate }: { config: MCPServers; onUpdate: (config: MCPServers) => void }) {
  const [jsonText, setJsonText] = useState(JSON.stringify(config, null, 2))
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handlePaste = (value: string) => {
    setJsonText(value)
    setError("")
    setSuccess(false)

    if (!value.trim()) return

    try {
      const parsed = JSON.parse(value)
      if (!parsed.mcpServers || typeof parsed.mcpServers !== "object") {
        setError("Invalid format: must have 'mcpServers' object")
        return
      }

      for (const [name, serverConfig] of Object.entries(parsed.mcpServers)) {
        const server = serverConfig as any
        if (!server.command || !Array.isArray(server.args)) {
          setError(`Server '${name}': missing command or args`)
          return
        }
      }

      onUpdate(parsed)
      saveMCPConfig(parsed)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON")
    }
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">JSON Configuration</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigator.clipboard.writeText(JSON.stringify(config, null, 2))}
          className="text-xs"
        >
          Copy
        </Button>
      </div>

      <textarea
        value={jsonText}
        onChange={e => handlePaste(e.target.value)}
        className={cn(
          "w-full h-64 px-3 py-2 rounded-lg border bg-background text-xs font-mono resize-none focus:outline-none focus:ring-2 transition-all",
          error && "border-red-500 focus:ring-red-500",
          success && "border-green-500 focus:ring-green-500",
          !error && !success && "border-border focus:ring-primary/20 focus:border-primary",
        )}
      />

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
          <AlertCircle className="size-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
          <Check className="size-4" />
          Configuration updated
        </div>
      )}
    </Card>
  )
}
