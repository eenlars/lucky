import type { Tool } from "ai"
import { type ToolExecutionContext, toAITool } from "../factory/toolFactory"
import type { ToolkitDefinition } from "../registration/codeToolsRegistration"
import type { CodeToolName } from "./types"

// more flexible type for tool registration
export type FlexibleToolDefinition = {
  name: string
  description?: string
  // todo-typesafety: replace 'any' with proper parameter and return types - violates CLAUDE.md "we hate any"
  parameters: any
  execute: (params: any, externalContext?: any) => Promise<any>
}

/**
 * Modern registry for managing code tools (defineTool-based approach)
 */
export class CodeToolRegistry {
  private tools = new Map<CodeToolName, FlexibleToolDefinition>()
  private initialized = false
  private defaultRegistration: Promise<void> | null = null

  /**
   * Register a tool definition created with defineTool()
   */
  register(tool: FlexibleToolDefinition): void {
    // todo-typesafety: unsafe 'as' assertions - violates CLAUDE.md "we hate as"
    if (this.tools.has(tool.name as CodeToolName)) {
      throw new Error(`Tool ${tool.name} is already registered`)
    }

    this.tools.set(tool.name as CodeToolName, tool)
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
      // todo-typesafety: unsafe 'as any' assertion - violates CLAUDE.md "we hate as"
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
        // todo-typesafety: unsafe 'as any' assertion - violates CLAUDE.md "we hate as"
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
    loader: () => Promise<ToolkitDefinition[] | null | undefined>,
    options?: { validate?: (groups: ToolkitDefinition[]) => Promise<void> | void },
  ): Promise<void> {
    if (this.initialized || this.tools.size > 0) {
      return
    }

    if (this.defaultRegistration) {
      await this.defaultRegistration
      return
    }

    this.defaultRegistration = (async () => {
      const groups = await loader()
      if (!groups || groups.length === 0) {
        return
      }

      if (options?.validate) {
        await options.validate(groups)
      }

      const definitions = groups.flatMap((group: ToolkitDefinition) =>
        group.tools.map(tool => tool.toolFunc as unknown as FlexibleToolDefinition),
      )

      this.registerMany(definitions)
      await this.initialize()
    })().finally(() => {
      this.defaultRegistration = null
    })

    await this.defaultRegistration
  }
}

// global registry instance (kept for backwards compatibility)
export const codeToolRegistry = new CodeToolRegistry()

// factory for creating isolated registries
export const createCodeToolRegistry = () => new CodeToolRegistry()
