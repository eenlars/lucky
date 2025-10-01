import type { MCPToolName } from "../registry/types"
import { experimental_createMCPClient, type ToolSet } from "ai"
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio"
import fs from "fs"
import path from "path"

/**
 * Configuration for MCP client setup
 */
export interface MCPConfig {
  mcpServers: Record<
    string,
    {
      command: string
      args: string[]
      env?: Record<string, string>
    }
  >
}

export interface MCPClientConfig {
  /**
   * Path to the MCP configuration file (mcp-secret.json)
   * If not provided, MCP tools will not be available
   */
  configPath?: string
  /**
   * Environment variables for substitution in MCP config
   */
  envVars?: Record<string, string>
  /**
   * Enable debug logging
   */
  enableLogging?: boolean
}

// Environment variable substitution utility
function substituteEnvVars(str: string, envVars: Record<string, string> = {}): string {
  return str.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    return envVars[varName] ?? process.env[varName] ?? match
  })
}

// Load external MCP config if it exists
function loadExternalMCPConfig(config: MCPClientConfig): MCPConfig["mcpServers"] {
  try {
    if (!config.configPath) {
      if (config.enableLogging) {
        console.warn("No MCP config path provided. MCP tools will not be available.")
      }
      return {}
    }

    const configPath = path.resolve(config.configPath)
    if (!fs.existsSync(configPath)) {
      if (config.enableLogging) {
        console.warn(`MCP config file does not exist at ${configPath}. MCP tools will not be available.`)
      }
      return {}
    }

    const configContent = fs.readFileSync(configPath, "utf-8")
    const parsedConfig: MCPConfig = JSON.parse(configContent)

    if (!parsedConfig.mcpServers || typeof parsedConfig.mcpServers !== "object") {
      console.warn("Invalid MCP config: missing or invalid 'mcpServers' field")
      return {}
    }

    if (config.enableLogging) {
      console.log("Loaded MCP config from:", configPath)
    }

    // Validate each MCP server config
    const validatedServers: MCPConfig["mcpServers"] = {}
    for (const [name, serverConfig] of Object.entries(parsedConfig.mcpServers)) {
      if (!serverConfig.command || !Array.isArray(serverConfig.args)) {
        console.warn(`Invalid MCP server config for '${name}': missing command or args`)
        continue
      }
      // Substitute environment variables in config
      const processedConfig = {
        ...serverConfig,
        command: substituteEnvVars(serverConfig.command, config.envVars),
        args: serverConfig.args.map(arg => substituteEnvVars(arg, config.envVars)),
        env: serverConfig.env
          ? Object.fromEntries(
              Object.entries(serverConfig.env).map(([key, value]) => [key, substituteEnvVars(value, config.envVars)]),
            )
          : undefined,
      }

      validatedServers[name] = processedConfig
    }

    if (config.enableLogging && Object.keys(validatedServers).length > 0) {
      console.log(`Loaded external MCP servers: ${Object.keys(validatedServers).join(", ")}`)
    }

    return validatedServers
  } catch (error) {
    console.error("Failed to load MCP config:", error)
    return {}
  }
}

/**
 * MCP Client Manager - handles setup and caching of MCP clients
 */
export class MCPClientManager {
  private clientCache = new Map<string, any>()
  private mcpConfig: MCPConfig["mcpServers"] | null = null
  private config: MCPClientConfig

  constructor(config: MCPClientConfig = {}) {
    this.config = config
  }

  /**
   * Lazy getter for MCP config - only loads when actually needed
   */
  private getCreateTools(): MCPConfig["mcpServers"] {
    if (this.mcpConfig === null) {
      this.mcpConfig = loadExternalMCPConfig(this.config)
    }
    return this.mcpConfig
  }

  /**
   * Spin up MCP clients for the requested tool names and return a single
   * `tools` object suitable for `generateText({ tools })` or `streamText({ tools })`.
   * Clients are cached per workflow to maintain persistent sessions (e.g., browser state).
   */
  async setupMCPForNode(toolNames: MCPToolName[] | null | undefined, workflowId: string): Promise<ToolSet> {
    const safeToolNames: MCPToolName[] = Array.isArray(toolNames) ? toolNames : []
    if (safeToolNames.length === 0) {
      return {}
    }

    // 1. Get or create clients (reuse cached clients for session persistence)
    const clientPromises = await Promise.all(
      safeToolNames.map(async name => {
        // Create cache key combining workflow ID and tool name
        const cacheKey = workflowId ? `${workflowId}:${name}` : name

        // Check if we already have a client for this workflow+tool combination
        if (this.clientCache.has(cacheKey)) {
          return this.clientCache.get(cacheKey)
        }

        const createTools = this.getCreateTools()
        const cfg = createTools[name]
        if (!cfg) {
          console.warn(
            `MCP tool '${name}' not found in configuration. Available tools: ${Object.keys(createTools).join(", ")}`,
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
        this.clientCache.set(cacheKey, client)
        return client
      }),
    )

    // Filter out null clients
    const clients = clientPromises.filter((client): client is any => client !== null)

    // 2. Fetch each client's tool set
    const toolSets = await Promise.all(clients.map(client => client.tools()))

    // 3. Merge all tool definitions into one flat object
    const tools = Object.assign({}, ...toolSets)

    return tools
  }

  /**
   * Clear all cached MCP clients (useful for cleanup in tests)
   */
  clearMCPClientCache(): void {
    this.clientCache.clear()
  }

  /**
   * Clear cached MCP clients for a specific workflow
   */
  clearWorkflowMCPClientCache(workflowId: string): void {
    const keysToDelete = Array.from(this.clientCache.keys()).filter(key => key.startsWith(`${workflowId}:`))
    keysToDelete.forEach(key => this.clientCache.delete(key))
  }
}

// Note: No global instance created here - users should instantiate their own MCPClientManager
// with appropriate configuration
