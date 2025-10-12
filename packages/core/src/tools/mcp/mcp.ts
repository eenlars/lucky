import fs from "node:fs"
import path from "node:path"
import { getCoreConfig } from "@core/core-config/coreConfig"
import { envi } from "@core/utils/env.mjs"
import type { MCPToolName } from "@lucky/tools"
import { type ToolSet, experimental_createMCPClient } from "ai"
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio"

// Environment variable substitution utility
function substituteEnvVars(str: string, missingVars?: string[]): string {
  return str.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    const value = (envi as Record<string, any>)[varName] ?? process.env[varName]
    if (value === undefined && missingVars) {
      if (!missingVars.includes(varName)) {
        missingVars.push(varName)
      }
      return match // Keep placeholder if variable is missing
    }
    return value ?? match
  })
}

// Check if a command is accessible (exists and is executable)
function isCommandAccessible(command: string): boolean {
  try {
    // Check if it's an absolute path
    if (path.isAbsolute(command)) {
      return fs.existsSync(command) && (fs.statSync(command).mode & fs.constants.X_OK) !== 0
    }

    // For relative paths or commands in PATH, try to access
    // This is a basic check - the command might still fail at runtime
    // but this catches the most common issues
    return fs.existsSync(command)
  } catch {
    // If we can't check, assume it's accessible and let it fail at runtime with a better error
    return true
  }
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
  const config = getCoreConfig()
  try {
    // Prefer process.env for tests that set MCP_SECRET_PATH dynamically,
    // fallback to envi (mocked in tests), then to runtime default
    const configuredPath = process.env.MCP_SECRET_PATH ?? envi.MCP_SECRET_PATH ?? undefined
    const configPath = configuredPath ? path.resolve(configuredPath) : path.join(config.paths.runtime, "mcp-secret.json")

    if (!fs.existsSync(configPath)) {
      // Provide helpful setup guidance
      console.warn("\n⚠️  MCP Configuration Missing")
      console.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      console.warn(`📁 Expected location: ${configPath}`)
      console.warn("\n📝 To enable MCP tools:")
      console.warn("   1. Create mcp-secret.json in the runtime folder")
      console.warn("   2. See apps/examples/mcp-config.example.json for format")
      console.warn("   3. Configure your MCP servers with valid commands and args")
      console.warn("\n💡 Tip: Set MCP_SECRET_PATH env var to use a custom location")
      console.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
      return {}
    }

    const configContent = fs.readFileSync(configPath, "utf-8")
    let mcpConfig: MCPConfig

    try {
      mcpConfig = JSON.parse(configContent)
    } catch (parseError) {
      console.error("\n❌ Failed to parse mcp-secret.json")
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      console.error(`📁 File: ${configPath}`)
      console.error(`🔍 Error: ${parseError instanceof Error ? parseError.message : String(parseError)}`)
      console.error("\n💡 Check that your JSON is valid:")
      console.error("   - All strings are in double quotes")
      console.error("   - No trailing commas")
      console.error("   - Proper bracket/brace matching")
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
      return {}
    }

    if (!mcpConfig.mcpServers || typeof mcpConfig.mcpServers !== "object") {
      console.error("\n❌ Invalid mcp-secret.json structure")
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      console.error(`📁 File: ${configPath}`)
      console.error('🔍 Missing or invalid "mcpServers" field')
      console.error("\n💡 Expected format:")
      console.error('   { "mcpServers": { "serverName": { "command": "...", "args": [...] } } }')
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
      return {}
    }

    console.log(`📍 Loading MCP config from: ${configPath}`)

    // Validate each MCP server config
    const validatedServers: MCPConfig["mcpServers"] = {}
    const errors: string[] = []

    for (const [name, serverConfig] of Object.entries(mcpConfig.mcpServers)) {
      if (!serverConfig.command || !Array.isArray(serverConfig.args)) {
        errors.push(`  ❌ ${name}: missing 'command' or 'args' (must be an array)`)
        continue
      }

      // Substitute environment variables and track missing ones
      const missingVars: string[] = []
      const processedConfig = {
        ...serverConfig,
        command: substituteEnvVars(serverConfig.command, missingVars),
        args: serverConfig.args.map(arg => substituteEnvVars(arg, missingVars)),
        env: serverConfig.env
          ? Object.fromEntries(
              Object.entries(serverConfig.env).map(([key, value]) => [key, substituteEnvVars(value, missingVars)]),
            )
          : undefined,
      }

      if (missingVars.length > 0) {
        errors.push(`  ⚠️  ${name}: missing environment variables: ${missingVars.join(", ")}`)
      }

      // Validate command exists (warn but don't block - could be a test environment or runtime-available command)
      if (!isCommandAccessible(processedConfig.command)) {
        errors.push(
          `  ⚠️  ${name}: command '${processedConfig.command}' may not exist or be executable (will fail at runtime if invalid)`,
        )
      }

      validatedServers[name] = processedConfig
    }

    if (errors.length > 0) {
      console.warn("\n⚠️  MCP Configuration Issues")
      console.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      errors.forEach(err => console.warn(err))
      console.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
    }

    if (Object.keys(validatedServers).length > 0) {
      console.log(`✅ Loaded MCP servers: ${Object.keys(validatedServers).join(", ")}\n`)
    } else if (Object.keys(mcpConfig.mcpServers).length > 0) {
      console.warn("⚠️  No valid MCP servers found (all configurations failed validation)\n")
    }

    return validatedServers
  } catch (error) {
    console.error("\n❌ Unexpected error loading MCP configuration")
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.error(error)
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
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
  workflowId: string,
): Promise<ToolSet> {
  const safeToolNames: MCPToolName[] = Array.isArray(toolNames) ? toolNames : []
  if (safeToolNames.length === 0) {
    return {}
  }

  // 1. Get or create clients (reuse cached clients for session persistence)
  const clientResults = await Promise.allSettled(
    safeToolNames.map(async name => {
      // Create cache key combining workflow ID and tool name
      const cacheKey = workflowId ? `${workflowId}:${name}` : name

      // Check if we already have a client for this workflow+tool combination
      if (clientCache.has(cacheKey)) {
        return { name, client: clientCache.get(cacheKey) }
      }

      const createTools = getCreateTools()
      const cfg = createTools[name]
      if (!cfg) {
        const availableTools = Object.keys(createTools)
        console.warn("\n⚠️  MCP Tool Not Found")
        console.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        console.warn(`🔍 Requested: '${name}'`)
        if (availableTools.length > 0) {
          console.warn(`📋 Available: ${availableTools.join(", ")}`)
        } else {
          console.warn("📋 No MCP tools configured (check mcp-secret.json)")
        }
        console.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
        return null
      }

      try {
        const transport = new Experimental_StdioMCPTransport({
          command: cfg.command,
          args: cfg.args,
          env: cfg.env,
        })
        const client = experimental_createMCPClient({ transport })

        // Cache the client for reuse with workflow-specific key
        clientCache.set(cacheKey, client)
        return { name, client }
      } catch (error) {
        console.error("\n❌ Failed to create MCP client")
        console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        console.error(`🔧 Tool: ${name}`)
        console.error(`📝 Command: ${cfg.command}`)
        console.error(`📋 Args: ${cfg.args.join(" ")}`)
        console.error(`💥 Error: ${error instanceof Error ? error.message : String(error)}`)
        console.error("\n💡 Troubleshooting:")
        console.error("   - Verify the command exists and is executable")
        console.error("   - Check file permissions (chmod +x)")
        console.error("   - Ensure all dependencies are installed")
        console.error("   - Try running the command manually")
        console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

        // Clean up from cache if it was added
        clientCache.delete(cacheKey)
        return null
      }
    }),
  )

  // Extract successful clients and log failures
  const successfulClients: Array<{ name: string; client: any }> = []
  const failedTools: string[] = []

  for (let i = 0; i < clientResults.length; i++) {
    const result = clientResults[i]
    const toolName = safeToolNames[i]

    if (result.status === "fulfilled" && result.value !== null) {
      successfulClients.push(result.value)
    } else if (result.status === "rejected") {
      failedTools.push(toolName)
      console.error(`\n❌ MCP client connection failed for '${toolName}':`, result.reason)
    } else {
      failedTools.push(toolName)
    }
  }

  if (failedTools.length > 0) {
    console.warn("\n⚠️  Some MCP tools failed to initialize")
    console.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.warn(`❌ Failed tools: ${failedTools.join(", ")}`)
    if (successfulClients.length > 0) {
      console.warn(`✅ Working tools: ${successfulClients.map(c => c.name).join(", ")}`)
    } else {
      console.warn("🚫 No MCP tools are available")
    }
    console.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
  }

  // 2. Fetch each client's tool set with error handling
  const toolSetResults = await Promise.allSettled(
    successfulClients.map(async ({ name, client }) => {
      try {
        const tools = await client.tools()
        return { name, tools }
      } catch (error) {
        console.error(`\n❌ Failed to fetch tools for MCP client '${name}':`, error)
        // Remove failed client from cache
        const cacheKey = workflowId ? `${workflowId}:${name}` : name
        clientCache.delete(cacheKey)
        return null
      }
    }),
  )

  // 3. Merge all tool definitions into one flat object
  const allTools: ToolSet = {}
  for (const result of toolSetResults) {
    if (result.status === "fulfilled" && result.value !== null) {
      Object.assign(allTools, result.value.tools)
    }
  }

  return allTools
}

/**
 * Clear all cached MCP clients (useful for cleanup in tests)
 */
export function clearMCPClientCache() {
  const count = clientCache.size
  clientCache.clear()
  if (count > 0) {
    console.log(`🧹 Cleared ${count} cached MCP client(s)`)
  }
}

/**
 * Clear cached MCP clients for a specific workflow
 */
export function clearWorkflowMCPClientCache(workflowId: string) {
  const keysToDelete = Array.from(clientCache.keys()).filter(key => key.startsWith(`${workflowId}:`))
  keysToDelete.forEach(key => clientCache.delete(key))
  if (keysToDelete.length > 0) {
    console.log(`🧹 Cleared ${keysToDelete.length} cached MCP client(s) for workflow ${workflowId}`)
  }
}

/**
 * Get status of MCP configuration and available tools
 */
export function getMCPStatus(): {
  configured: boolean
  availableServers: string[]
  cachedClients: number
  configPath: string
} {
  const config = getCoreConfig()
  const createTools = getCreateTools()
  const configuredPath = process.env.MCP_SECRET_PATH ?? envi.MCP_SECRET_PATH ?? undefined
  const configPath = configuredPath ? path.resolve(configuredPath) : path.join(config.paths.runtime, "mcp-secret.json")

  return {
    configured: Object.keys(createTools).length > 0,
    availableServers: Object.keys(createTools),
    cachedClients: clientCache.size,
    configPath,
  }
}

/**
 * Display MCP status in a user-friendly format
 */
export function logMCPStatus(): void {
  const status = getMCPStatus()

  console.log("\n📊 MCP Status")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log(`📁 Config path: ${status.configPath}`)
  console.log(`✅ Configured: ${status.configured ? "Yes" : "No"}`)

  if (status.configured) {
    console.log(`🔧 Available servers: ${status.availableServers.join(", ")}`)
    console.log(`💾 Cached clients: ${status.cachedClients}`)
  } else {
    console.log("⚠️  No MCP servers configured")
    console.log("\n💡 To set up MCP:")
    console.log("   1. Create mcp-secret.json at the config path above")
    console.log("   2. See apps/examples/mcp-config.example.json for format")
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
}
