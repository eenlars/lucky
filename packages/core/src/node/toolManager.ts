import { lgg } from "@core/utils/logging/Logger" // src/core/node/tools/toolManager.ts

import path from "node:path"
import { getCoreConfig, isLoggingEnabled } from "@core/core-config/coreConfig"
import { isNir } from "@lucky/shared/client"
import { setupCodeToolsForNode, setupMCPForNode } from "@lucky/tools"
import type { CodeToolName, MCPToolName } from "@lucky/tools/client"
import type { ToolExecutionContext } from "@lucky/tools/client"
import type { Tool, ToolSet } from "ai"

/**
 * Manages tool initialization and runtime access for workflow nodes.
 *
 * ## Runtime Architecture
 *
 * Handles two types of tools:
 * - **MCP Tools**: External tools via Model Context Protocol (initialized once)
 * - **Code Tools**: Internal TypeScript functions (context-aware initialization)
 *
 * ## Initialization Strategy
 *
 * - MCP tools initialized eagerly on first call (network setup required)
 * - Code tools initialized lazily with execution context (file access needed)
 * - Idempotent initialization prevents duplicate setup
 *
 * ## Runtime Flow
 *
 * 1. Node creation → ToolManager instantiated with tool lists
 * 2. Pipeline prepare → initializeTools() sets up MCP connections
 * 3. Pipeline execute → getAllTools() provides context-aware tool set
 * 4. Tool invocation → Parameters validated and executed
 *
 * ## Error Handling
 *
 * - MCP initialization failures bubble up (critical for node operation)
 * - Code tool failures fall back to cached tools (graceful degradation)
 * - Missing tools logged but don't crash execution
 */
export class ToolManager {
  private mcpTools: ToolSet = {}
  private codeTools: ToolSet = {}
  private toolsInitialized = false
  private readonly mcpToolNames: MCPToolName[]
  private readonly codeToolNames: CodeToolName[]

  constructor(
    private readonly nodeId: string,
    mcpToolNames: MCPToolName[] | null | undefined,
    codeToolNames: CodeToolName[] | null | undefined,
    private readonly workflowVersionId: string,
  ) {
    // Normalize undefined/null to empty arrays to simplify downstream logic
    this.mcpToolNames = Array.isArray(mcpToolNames) ? mcpToolNames : []
    this.codeToolNames = Array.isArray(codeToolNames) ? codeToolNames : []
  }

  /**
   * Idempotent tool initialization with error bubbling.
   *
   * Runtime behavior:
   * - First call: Sets up MCP connections and marks initialized
   * - Subsequent calls: Return immediately (no-op)
   * - No tools: Mark initialized without setup
   *
   * @throws Error if MCP tool initialization fails
   */
  public async initializeTools(): Promise<void> {
    if (this.toolsInitialized) return

    // if no tools to initialize, mark as initialized immediately
    if (isNir(this.mcpToolNames) && isNir(this.codeToolNames)) {
      this.toolsInitialized = true
      return
    }

    if (isLoggingEnabled("Tools")) {
      lgg.info(`🔧 Initializing tools for node "${this.nodeId}"...`)
      lgg.info(`📋 MCP Tools: [${this.mcpToolNames.join(", ")}]`)
      lgg.info(`📋 Code Tools: [${this.codeToolNames.join(", ")}]`)
    }

    try {
      // Initialize MCP tools eagerly; defer code tools until per-invocation context is available
      const config = getCoreConfig()
      const mcpConfigPath = path.join(config.paths.runtime, "mcp-secret.json")
      const mcp = await setupMCPForNode(this.mcpToolNames, this.workflowVersionId, mcpConfigPath)
      this.mcpTools = mcp
      this.codeTools = {}
      this.toolsInitialized = true

      const mcpToolNames = Object.keys(this.mcpTools)
      const codeToolNames = Object.keys(this.codeTools)
      const totalToolCount = mcpToolNames.length + codeToolNames.length

      if (isLoggingEnabled("Tools")) {
        lgg.info(`✅ Successfully initialized ${totalToolCount} tools for node "${this.nodeId}":`)
        if (mcpToolNames.length > 0) {
          lgg.info(`🔌 MCP Tools (${mcpToolNames.length}): ${mcpToolNames.join(", ")}`)
        }
        if (codeToolNames.length > 0) {
          lgg.info(`⚙️  Code Tools (${codeToolNames.length}): ${codeToolNames.join(", ")}`)
        }
      }
    } catch (err) {
      lgg.error(`❌ Failed to init tools for node ${this.nodeId}:`, err)
      throw err
    }
  }

  /**
   * Gets all available tools merged into a single object.
   *
   * Runtime behavior:
   * 1. MCP tools returned from cache (pre-initialized)
   * 2. Code tools created with execution context (file access)
   * 3. Tools merged and filtered for undefined entries
   * 4. Validation ensures tool count consistency
   *
   * Context-aware initialization enables code tools to:
   * - Access workflow files
   * - Read/write to context store
   * - Understand workflow goals
   *
   * @param toolExecutionContext Optional context for code tool initialization
   * @returns Combined toolset ready for AI execution
   */
  async getAllTools(toolExecutionContext?: ToolExecutionContext): Promise<ToolSet> {
    let codeTools = this.codeTools

    // if context provided, setup code tools with runtime information
    if (toolExecutionContext) {
      try {
        // setup code tools with context on-demand
        const contextualCodeTools = await setupCodeToolsForNode(this.codeToolNames, toolExecutionContext)
        codeTools = contextualCodeTools
      } catch (error) {
        lgg.error("Failed to setup code tools with context:", error)
        // fallback to cached tools
        codeTools = this.codeTools
      }
    }

    const allTools = { ...this.mcpTools, ...codeTools }

    // Filter out any undefined tools
    const filteredTools = Object.fromEntries(
      Object.entries(allTools).filter(([_, tool]) => tool !== undefined),
    ) as ToolSet

    if (Object.keys(filteredTools).length < Object.keys(allTools).length) {
      lgg.error(`Different number of tools found for node "${this.nodeId}". This is a bug.`, filteredTools, allTools)
    }

    return filteredTools
  }

  /**
   * Gets MCP tools.
   */
  public getMCPTools(): Record<string, Tool> {
    return this.mcpTools
  }

  /**
   * Gets code tools.
   */
  public getCodeTools(): Record<string, Tool> {
    return this.codeTools
  }
}
