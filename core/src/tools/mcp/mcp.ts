import type { MCPToolName } from "@core/tools/tool.types"
import { envi } from "@core/utils/env.mjs"
import { PATHS } from "@core/core-config/compat"
import { experimental_createMCPClient, type ToolSet } from "ai"
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio"
import fs from "fs"
import path from "path"

// Environment variable substitution utility
function substituteEnvVars(str: string): string {
  return str.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    return (envi as Record<string, any>)[varName] ?? process.env[varName] ?? match
  })
}

// Load external MCP config if it exists
interface MCPConfig {
  mcpServers: Record<
    string,
    {
      command: string
      args: string[]
      env?: Record<string, string>
    }
  >
}

function loadExternalMCPConfig(): MCPConfig["mcpServers"] {
  try {
    // Prefer process.env for tests that set MCP_SECRET_PATH dynamically,
    // fallback to envi (mocked in tests), then to runtime default
    const configuredPath = process.env.MCP_SECRET_PATH ?? envi.MCP_SECRET_PATH ?? undefined
    const configPath = configuredPath ? path.resolve(configuredPath) : path.join(PATHS.runtime, "mcp-secret.json")
    if (!fs.existsSync(configPath)) {
      // Don't throw during build - just return empty config
      console.warn(
        "mcp-secret.json does not exist. MCP tools will not be available. Please create it in the runtime folder."
      )
      return {}
    }

    const configContent = fs.readFileSync(configPath, "utf-8")
    const config: MCPConfig = JSON.parse(configContent)

    if (!config.mcpServers || typeof config.mcpServers !== "object") {
      console.warn("Invalid mcp-secret.json: missing or invalid 'mcpServers' field")
      return {}
    }

    console.log("configPath", configPath)

    // Validate each MCP server config
    const validatedServers: MCPConfig["mcpServers"] = {}
    for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
      if (!serverConfig.command || !Array.isArray(serverConfig.args)) {
        console.warn(`Invalid MCP server config for '${name}': missing command or args`)
        continue
      }
      // Substitute environment variables in config
      const processedConfig = {
        ...serverConfig,
        command: substituteEnvVars(serverConfig.command),
        args: serverConfig.args.map(substituteEnvVars),
        env: serverConfig.env
          ? Object.fromEntries(Object.entries(serverConfig.env).map(([key, value]) => [key, substituteEnvVars(value)]))
          : undefined,
      }

      validatedServers[name] = processedConfig
    }

    if (Object.keys(validatedServers).length > 0) {
      console.log(`Loaded external MCP servers: ${Object.keys(validatedServers).join(", ")}`)
    }

    return validatedServers
  } catch (error) {
    console.error("Failed to load mcp-secret.json:", error)
    return {}
  }
}

// Lazy-loaded to avoid build-time requirements
let externalMCPConfig: MCPConfig["mcpServers"] | null = null

// Lazy getter for MCP config - only loads when actually needed
function getCreateTools(): Record<string, { command: string; args: string[]; env?: Record<string, string> }> {
  if (externalMCPConfig === null) {
    externalMCPConfig = loadExternalMCPConfig()
  }
  return externalMCPConfig
}

// Cache for persistent MCP clients, keyed by workflow ID and tool name
const clientCache = new Map<string, any>()

/**
 * Spin up MCP clients for the requested tool names and return a single
 * `tools` object suitable for `generateText({ tools })` or `streamText({ tools })`.
 * Clients are cached per workflow to maintain persistent sessions (e.g., browser state).
 */
export async function setupMCPForNode(
  toolNames: MCPToolName[] | null | undefined,
  workflowId: string
): Promise<ToolSet> {
  const safeToolNames: MCPToolName[] = Array.isArray(toolNames) ? toolNames : []
  if (safeToolNames.length === 0) {
    return {}
  }

  // 1. Get or create clients (reuse cached clients for session persistence)
  const clientPromises = await Promise.all(
    safeToolNames.map(async (name) => {
      // Create cache key combining workflow ID and tool name
      const cacheKey = workflowId ? `${workflowId}:${name}` : name

      // Check if we already have a client for this workflow+tool combination
      if (clientCache.has(cacheKey)) {
        return clientCache.get(cacheKey)
      }

      const createTools = getCreateTools()
      const cfg = createTools[name]
      if (!cfg) {
        console.warn(
          `MCP tool '${name}' not found in configuration. Available tools: ${Object.keys(createTools).join(", ")}`
        )
        return null
      }

      const transport = new Experimental_StdioMCPTransport({
        command: cfg.command,
        args: cfg.args,
        env: cfg.env,
      })
      const client = experimental_createMCPClient({ transport })

      // Cache the client for reuse with workflow-specific key
      clientCache.set(cacheKey, client)
      return client
    })
  )

  // Filter out null clients
  const clients = clientPromises.filter((client): client is any => client !== null)

  // 2. Fetch each client's tool set
  const toolSets = await Promise.all(clients.map((client) => client.tools()))

  // 3. Merge all tool definitions into one flat object
  const tools = Object.assign({}, ...toolSets)

  return tools
}

/**
 * Clear all cached MCP clients (useful for cleanup in tests)
 */
export function clearMCPClientCache() {
  clientCache.clear()
}

/**
 * Clear cached MCP clients for a specific workflow
 */
export function clearWorkflowMCPClientCache(workflowId: string) {
  const keysToDelete = Array.from(clientCache.keys()).filter((key) => key.startsWith(`${workflowId}:`))
  keysToDelete.forEach((key) => clientCache.delete(key))
}
