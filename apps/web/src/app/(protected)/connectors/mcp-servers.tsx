"use client"

import { PromptBar, type PromptBarContext } from "@/components/ai-prompt-bar/PromptBar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { type MCPServerConfig, useMCPConfigStore } from "@/stores/mcp-config-store"
import { AlertCircle, Check, ChevronDown, FileJson } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export function MCPServersConfig() {
  const config = useMCPConfigStore(state => state.config)
  const addServer = useMCPConfigStore(state => state.addServer)
  const deleteServer = useMCPConfigStore(state => state.deleteServer)

  const [showJsonMode, setShowJsonMode] = useState(false)

  const serverNames = Object.keys(config.mcpServers)
  const updateConfig = useMCPConfigStore(state => state.updateConfig)

  // Create context for the PromptBar
  const mcpPromptContext: PromptBarContext = {
    contextType: "mcp-config",
    getCurrentState: async () => config,
    applyChanges: async changes => {
      try {
        updateConfig(changes)
        toast.success("MCP configuration updated")
      } catch (error) {
        toast.error("Failed to update configuration")
        throw error
      }
    },
    apiEndpoint: "/api/ai/artifact",
    placeholder: "Tell me how to modify the MCP server configuration...",
    mode: "edit",
    position: "bottom",
    onMessage: (message, type) => {
      if (type === "error") {
        toast.error(message)
      }
    },
  }

  return (
    <>
      <div className="max-w-2xl space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-light text-foreground">MCP Servers</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Connect to Model Context Protocol servers to extend your workflows with external tools
          </p>
        </div>

        {/* Add Server Form */}
        {/* TODO: Bring back Add Server Form later */}
        {/* <AddServerForm onAdd={addServer} existingNames={serverNames} /> */}

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
                  onDelete={() => deleteServer(name)}
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
        {showJsonMode && <JsonEditor />}
      </div>

      {/* AI Prompt Bar - Outside container to overlay */}
      <PromptBar context={mcpPromptContext} />
    </>
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
  const [authType, setAuthType] = useState<"none" | "apikey">("none")
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
        {/* TODO: Bring back Remote/Local toggle later */}
        {/* <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
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
        </div> */}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
            <AlertCircle className="size-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Name */}
        <div className="space-y-2">
          <label htmlFor="mcp-name" className="block text-sm font-medium text-foreground">
            Name
          </label>
          <input
            id="mcp-name"
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
              <label htmlFor="mcp-server-url" className="block text-sm font-medium text-foreground">
                Server URL
              </label>
              <input
                id="mcp-server-url"
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com/mcp"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
              />
            </div>

            {/* Authentication */}
            <div className="space-y-2">
              <label htmlFor="mcp-auth-type" className="block text-sm font-medium text-foreground">
                Authentication
              </label>
              <select
                id="mcp-auth-type"
                value={authType}
                onChange={e => setAuthType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="none">None</option>
                <option value="apikey">API Key</option>
              </select>
            </div>

            {/* API Key Input */}
            {authType === "apikey" && (
              <div className="space-y-2">
                <label htmlFor="mcp-api-key" className="block text-sm font-medium text-foreground">
                  API Key
                </label>
                <input
                  id="mcp-api-key"
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  autoComplete="off"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                />
              </div>
            )}
          </>
        ) : (
          <>
            {/* Command */}
            <div className="space-y-2">
              <label htmlFor="mcp-command" className="block text-sm font-medium text-foreground">
                Command
              </label>
              <input
                id="mcp-command"
                type="text"
                value={command}
                onChange={e => setCommand(e.target.value)}
                placeholder="e.g., npx, python3, node"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
              />
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label htmlFor="mcp-options" className="block text-sm font-medium text-foreground">
                Options
              </label>
              <textarea
                id="mcp-options"
                value={args}
                onChange={e => setArgs(e.target.value)}
                placeholder={"-y\n@modelcontextprotocol/server-tavily"}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono resize-none"
              />
            </div>

            {/* Environment variables */}
            <div className="space-y-2">
              <label htmlFor="mcp-env-vars" className="block text-sm font-medium text-foreground">
                Environment variables
              </label>
              <textarea
                id="mcp-env-vars"
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

function ServerRow({
  name,
  config,
  onDelete,
}: {
  name: string
  config: MCPServerConfig
  onDelete: () => void
}) {
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
        {/* TODO: Bring back Remove button later */}
        {/* <Button
          onClick={onDelete}
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="size-4 text-muted-foreground" />
        </Button> */}
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

function JsonEditor() {
  const config = useMCPConfigStore(state => state.config)
  const updateConfig = useMCPConfigStore(state => state.updateConfig)

  const [jsonText, setJsonText] = useState(() => JSON.stringify(config, null, 2))
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  // Sync jsonText when config changes from external sources (AI, etc)
  useEffect(() => {
    // Only update if not dirty (user hasn't made manual edits)
    if (!isDirty) {
      const newJsonText = JSON.stringify(config, null, 2)
      setJsonText(newJsonText)
    }
  }, [config, isDirty])

  const stripJsonComments = (jsonc: string): string => {
    // Track whether we're inside a string
    let result = ""
    let inString = false
    let escapeNext = false
    let inSingleLineComment = false
    let inMultiLineComment = false

    for (let i = 0; i < jsonc.length; i++) {
      const char = jsonc[i]
      const nextChar = jsonc[i + 1]

      // Handle escape sequences in strings
      if (escapeNext) {
        result += char
        escapeNext = false
        continue
      }

      // Check for escape character
      if (inString && char === "\\") {
        result += char
        escapeNext = true
        continue
      }

      // Toggle string state on unescaped quotes
      if (char === '"' && !inSingleLineComment && !inMultiLineComment) {
        inString = !inString
        result += char
        continue
      }

      // If we're in a string, don't process comments
      if (inString) {
        result += char
        continue
      }

      // Handle single-line comments
      if (char === "/" && nextChar === "/" && !inMultiLineComment) {
        inSingleLineComment = true
        i++ // Skip the second /
        continue
      }

      // Handle multi-line comments
      if (char === "/" && nextChar === "*" && !inSingleLineComment) {
        inMultiLineComment = true
        i++ // Skip the *
        continue
      }

      // End multi-line comment
      if (char === "*" && nextChar === "/" && inMultiLineComment) {
        inMultiLineComment = false
        i++ // Skip the /
        continue
      }

      // End single-line comment at newline
      if (inSingleLineComment && char === "\n") {
        inSingleLineComment = false
        result += char
        continue
      }

      // Skip characters in comments
      if (inSingleLineComment || inMultiLineComment) {
        continue
      }

      result += char
    }

    return result
  }

  const handleChange = (value: string) => {
    setJsonText(value)
    setIsDirty(true)
    setError("")
    setSuccess(false)
  }

  const handleFormat = () => {
    try {
      const jsonWithoutComments = stripJsonComments(jsonText)
      const parsed = JSON.parse(jsonWithoutComments)
      setJsonText(JSON.stringify(parsed, null, 2))
      setIsDirty(false)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON - cannot format")
    }
  }

  const handleApply = () => {
    if (!jsonText.trim()) return

    try {
      // Strip comments before parsing
      const jsonWithoutComments = stripJsonComments(jsonText)
      const parsed = JSON.parse(jsonWithoutComments)
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

      updateConfig(parsed)
      setIsDirty(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSONC")
    }
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">JSON Configuration</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Comments are supported</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleFormat} className="text-xs">
            Format
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(jsonText)} className="text-xs">
            Copy
          </Button>
          <Button variant="default" size="sm" onClick={handleApply} disabled={!isDirty} className="text-xs">
            Apply
          </Button>
        </div>
      </div>

      <textarea
        value={jsonText}
        onChange={e => handleChange(e.target.value)}
        className={cn(
          "w-full h-[600px] px-3 py-2 rounded-lg border bg-background text-xs font-mono resize-y focus:outline-none focus:ring-2 transition-all",
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
