/**
 * Placeholder tool exports for standalone core.
 * These are minimal exports to satisfy test imports.
 * In production, these would be imported from actual tool implementations.
 */

import { z } from "zod"

/**
 * Generic placeholder tool factory - creates tools without requiring valid MCPToolName
 * Used only for test compatibility, not for runtime tool execution
 */
function createPlaceholderTool<T extends string>(name: T, description: string, params: z.ZodType) {
  return {
    name,
    description,
    params,
    async execute() {
      return {
        success: false,
        error: `${name} tool not implemented in standalone mode`,
      }
    },
  }
}

/**
 * Placeholder tavily MCP tool (for test compatibility)
 * Type-safe placeholder without 'as any' cast
 */
export const tavily = createPlaceholderTool(
  "tavily",
  "Search the web using Tavily API",
  z.object({
    query: z.string().describe("Search query"),
  }),
)

/**
 * Placeholder todoWrite tool (for test compatibility)
 */
export const todoWrite = createPlaceholderTool(
  "todoWrite",
  "Create and manage structured task lists for coding sessions",
  z.object({
    todos: z.array(
      z.object({
        id: z.string(),
        content: z.string(),
        status: z.enum(["pending", "in_progress", "completed"]),
        priority: z.enum(["high", "medium", "low"]),
      }),
    ),
  }),
)

/**
 * Default export for dynamic imports
 */
export default todoWrite
