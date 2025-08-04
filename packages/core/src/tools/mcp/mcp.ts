import { PATHS } from "@/runtime/settings/constants"
import type { MCPToolName } from "@tools/tool.types"
import { experimental_createMCPClient, type ToolSet } from "ai"
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio"
import fs from "fs"
import path from "path"

// Environment variable substitution utility
function substituteEnvVars(str: string): string {
  return str.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    return process.env[varName] || match
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
    const configPath = path.join(PATHS.runtime, "mcp-config.json")
    if (!fs.existsSync(configPath)) {
      return {}
    }

    const configContent = fs.readFileSync(configPath, "utf-8")
    const config: MCPConfig = JSON.parse(configContent)

    if (!config.mcpServers || typeof config.mcpServers !== "object") {
      console.warn(
        "Invalid mcp-config.json: missing or invalid 'mcpServers' field"
      )
      return {}
    }

    // Validate each MCP server config
    const validatedServers: MCPConfig["mcpServers"] = {}
    for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
      if (!serverConfig.command || !Array.isArray(serverConfig.args)) {
        console.warn(
          `Invalid MCP server config for '${name}': missing command or args`
        )
        continue
      }
      // Substitute environment variables in config
      const processedConfig = {
        ...serverConfig,
        command: substituteEnvVars(serverConfig.command),
        args: serverConfig.args.map(substituteEnvVars),
        env: serverConfig.env
          ? Object.fromEntries(
              Object.entries(serverConfig.env).map(([key, value]) => [
                key,
                substituteEnvVars(value),
              ])
            )
          : undefined,
      }

      validatedServers[name] = processedConfig
    }

    if (Object.keys(validatedServers).length > 0) {
      console.log(
        `Loaded external MCP servers: ${Object.keys(validatedServers).join(", ")}`
      )
    }

    return validatedServers
  } catch (error) {
    console.error("Failed to load mcp-config.json:", error)
    return {}
  }
}

const externalMCPConfig = loadExternalMCPConfig()

// All MCP tools are now configured externally
const createTools: Record<
  string,
  { command: string; args: string[]; env?: Record<string, string> }
> = {
  ...externalMCPConfig,
}

// Cache for persistent MCP clients, keyed by workflow ID and tool name
const clientCache = new Map<string, any>()

/**
 * Spin up MCP clients for the requested tool names and return a single
 * `tools` object suitable for `generateText({ tools })` or `streamText({ tools })`.
 * Clients are cached per workflow to maintain persistent sessions (e.g., browser state).
 */
export async function setupMCPForNode(
  toolNames: MCPToolName[],
  workflowId: string
): Promise<ToolSet> {
  if (toolNames.length === 0) {
    return {}
  }

  // 1. Get or create clients (reuse cached clients for session persistence)
  const clientPromises = await Promise.all(
    toolNames.map(async (name) => {
      // Create cache key combining workflow ID and tool name
      const cacheKey = workflowId ? `${workflowId}:${name}` : name

      // Check if we already have a client for this workflow+tool combination
      if (clientCache.has(cacheKey)) {
        return clientCache.get(cacheKey)
      }

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
  const clients = clientPromises.filter(
    (client): client is any => client !== null
  )

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
  const keysToDelete = Array.from(clientCache.keys()).filter((key) =>
    key.startsWith(`${workflowId}:`)
  )
  keysToDelete.forEach((key) => clientCache.delete(key))
}
