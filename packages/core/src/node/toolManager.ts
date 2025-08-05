import { lgg } from "@logger" // src/core/node/tools/toolManager.ts
import { getLogging } from "@utils/config/runtimeConfig"

import { isNir } from "@utils/common/isNir"
import { setupCodeToolsForNode } from "@tools/code/codeToolsSetup"
import { setupMCPForNode } from "@tools/mcp/mcp"
import type { CodeToolName, MCPToolName } from "@tools/tool.types"
import type { ToolExecutionContext } from "@tools/toolFactory"
import { Tool, type ToolSet } from "ai"

/**
 * Manages tool initialization and provides tool-related utilities.
 */
export class ToolManager {
  private mcpTools: ToolSet = {}
  private codeTools: ToolSet = {}
  private toolsInitialized = false

  constructor(
    private readonly nodeId: string,
    private readonly mcpToolNames: MCPToolName[],
    private readonly codeToolNames: CodeToolName[],
    private readonly workflowVersionId: string
  ) {}

  /**
   * Idempotent, parallel tool‐loading with error bubbling.
   */
  public async initializeTools(): Promise<void> {
    if (this.toolsInitialized) return

    // if no tools to initialize, mark as initialized immediately
    if (isNir(this.mcpToolNames) && isNir(this.codeToolNames)) {
      this.toolsInitialized = true
      return
    }

    if (getLogging().Tools) {
      lgg.info(`🔧 Initializing tools for node "${this.nodeId}"...`)
      lgg.info(`  📋 MCP Tools: [${this.mcpToolNames.join(", ")}]`)
      lgg.info(`  📋 Code Tools: [${this.codeToolNames.join(", ")}]`)
    }

    try {
      const [mcp, code] = await Promise.all([
        setupMCPForNode(this.mcpToolNames, this.workflowVersionId),
        setupCodeToolsForNode(this.codeToolNames),
      ])
      this.mcpTools = mcp
      this.codeTools = code
      this.toolsInitialized = true

      const mcpToolNames = Object.keys(this.mcpTools)
      const codeToolNames = Object.keys(this.codeTools)
      const totalToolCount = mcpToolNames.length + codeToolNames.length

      if (getLogging().Tools) {
        lgg.info(
          `✅ Successfully initialized ${totalToolCount} tools for node "${this.nodeId}":`
        )
        if (mcpToolNames.length > 0) {
          lgg.info(
            `  🔌 MCP Tools (${mcpToolNames.length}): ${mcpToolNames.join(", ")}`
          )
        }
        if (codeToolNames.length > 0) {
          lgg.info(
            `  ⚙️  Code Tools (${codeToolNames.length}): ${codeToolNames.join(", ")}`
          )
        }
      }
    } catch (err) {
      lgg.error(`❌ Failed to init tools for node ${this.nodeId}:`, err)
      throw err
    }
  }

  /**
   * Gets all available tools merged into a single object.
   */
  async getAllTools(
    toolExecutionContext?: ToolExecutionContext
  ): Promise<ToolSet> {
    let codeTools = this.codeTools

    // If workflowInvocationId is provided, setup code tools with context
    if (toolExecutionContext) {
      try {
        // Setup code tools with context on-demand
        const contextualCodeTools = await setupCodeToolsForNode(
          this.codeToolNames,
          toolExecutionContext
        )
        codeTools = contextualCodeTools
      } catch (error) {
        lgg.error(`Failed to setup code tools with context:`, error)
        // Fallback to cached tools
        codeTools = this.codeTools
      }
    }

    const allTools = { ...this.mcpTools, ...codeTools }

    // Filter out any undefined tools
    const filteredTools = Object.fromEntries(
      Object.entries(allTools).filter(([_, tool]) => tool !== undefined)
    ) as ToolSet

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
