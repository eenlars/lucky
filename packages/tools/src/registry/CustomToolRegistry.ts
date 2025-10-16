import type { Tool } from "ai"
import { type ToolExecutionContext, toAITool } from "../factory/toolFactory"
import type { RS } from "../factory/types"
import type { ToolkitDefinition, ToolkitTool } from "../registration/customToolsRegistration"
import type { CodeToolName } from "./types"

export type FlexibleToolDefinition = ToolkitTool & {
  execute: (params: any, externalContext?: any) => Promise<RS<any>> | RS<any>
}

/**
 * Modern registry for managing code tools (defineTool-based approach)
 */
export class CustomToolRegistry {
  private tools = new Map<string, FlexibleToolDefinition>()
  private initialized = false
  private defaultRegistration: Promise<void> | null = null

  /**
   * Register a tool definition created with defineTool()
   */
  register(tool: FlexibleToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} is already registered`)
    }

    this.tools.set(tool.name, tool)
    this.initialized = false

    // Skip creating cached tools - they should always be created with proper context
    // Tools will be created on-demand in getToolRegistry/getToolsForNames methods
  }

  /**
   * Register multiple tool definitions
   */
  registerMany(tools: FlexibleToolDefinition[]): void {
    for (const tool of tools) {
      this.register(tool)
    }
  }

  /**
   * Unregister a tool
   */
  unregister(name: CodeToolName): boolean {
    return this.tools.delete(name)
  }

  /**
   * Get a tool definition by name
   */
  getTool(name: CodeToolName): FlexibleToolDefinition | undefined {
    return this.tools.get(name)
  }

  /**
   * Get all registered tool definitions
   */
  getAllTools(): FlexibleToolDefinition[] {
    return Array.from(this.tools.values())
  }

  /**
   * Initialize the registry (mark as ready for use)
   * Note: Tools must be explicitly registered via register() or registerMany()
   * before calling initialize(). This method just marks the registry as ready.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    console.log(`✅ Tool registry initialized (${this.tools.size} tools registered)`)
    this.initialized = true
  }

  /**
   * Clear all tools
   */
  async destroy(): Promise<void> {
    this.tools.clear()
    this.initialized = false
  }

  /**
   * Get the tool registry compatible with the AI framework
   */
  getToolRegistry(toolExecutionContext?: ToolExecutionContext): Record<string, Tool> {
    if (!toolExecutionContext) {
      throw new Error(
        "ToolExecutionContext is required to create tools. " +
          "Tools must be created with proper workflow context for security and correctness.",
      )
    }

    const contextualTools: Record<string, Tool> = {}
    for (const [name, toolDef] of this.tools) {
      contextualTools[name] = toAITool(toolDef as any, toolExecutionContext)
    }
    return contextualTools
  }

  /**
   * Get tools for specific tool names
   */
  getToolsForNames(names: CodeToolName[], toolExecutionContext?: ToolExecutionContext): Record<string, Tool> {
    if (!toolExecutionContext) {
      throw new Error(
        "ToolExecutionContext is required to create tools. " +
          "Tools must be created with proper workflow context for security and correctness.",
      )
    }

    const result: Record<string, Tool> = {}
    for (const name of names) {
      const toolDef = this.tools.get(name)
      if (toolDef) {
        result[name] = toAITool(toolDef as any, toolExecutionContext)
      }
    }
    return result
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalTools: number
    initialized: boolean
  } {
    return {
      totalTools: this.tools.size,
      initialized: this.initialized,
    }
  }

  /**
   * Ensure default tools are registered exactly once.
   * The loader must return a list of tools to register (or null/undefined to skip).
   */
  async ensureDefaultTools(
    loader: () => Promise<ToolkitDefinition<"code">[] | null | undefined>,
    options?: { validate?: (groups: ToolkitDefinition<"code">[]) => Promise<void> | void },
  ): Promise<void> {
    if (this.initialized || this.tools.size > 0) {
      return
    }

    if (this.defaultRegistration) {
      await this.defaultRegistration
      return
    }

    this.defaultRegistration = (async () => {
      const toolkits = await loader()
      if (!toolkits || toolkits.length === 0) {
        return
      }

      if (options?.validate) {
        await options.validate(toolkits)
      }

      const definitions = toolkits.flatMap(toolkit => toolkit.tools.map(tool => tool.toolFunc))

      this.registerMany(definitions)
      await this.initialize()
    })().finally(() => {
      this.defaultRegistration = null
    })

    await this.defaultRegistration
  }
}

// global registry instance (kept for backwards compatibility)
export const customToolRegistry = new CustomToolRegistry()

// factory for creating isolated registries
export const createCustomToolRegistry = () => new CustomToolRegistry()

// Back-compat named exports expected by public API
export { CustomToolRegistry as CodeToolRegistry }
export const codeToolRegistry = customToolRegistry
export const createCodeToolRegistry = createCustomToolRegistry
