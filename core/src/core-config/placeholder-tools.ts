/**
 * Placeholder tool exports for standalone core.
 * These are minimal exports to satisfy test imports.
 * In production, these would be imported from actual tool implementations.
 */

import { defineTool } from "@lucky/tools"
import { z } from "zod"

/**
 * Placeholder tavily MCP tool (for test compatibility)
 * Note: Using 'as any' since this is a placeholder and doesn't match core tool types
 */
export const tavily = defineTool({
  name: "tavily" as any,
  description: "Search the web using Tavily API",
  params: z.object({
    query: z.string().describe("Search query"),
  }),
  async execute() {
    return {
      success: false,
      error: "Tavily tool not implemented in standalone mode",
    }
  },
})

/**
 * Placeholder todoWrite tool (for test compatibility)
 */
export const todoWrite = defineTool({
  name: "todoWrite",
  description: "Create and manage structured task lists for coding sessions",
  params: z.object({
    todos: z.array(
      z.object({
        id: z.string(),
        content: z.string(),
        status: z.enum(["pending", "in_progress", "completed"]),
        priority: z.enum(["high", "medium", "low"]),
      }),
    ),
  }),
  async execute() {
    return {
      success: false,
      error: "TodoWrite tool not implemented in standalone mode",
    }
  },
})

/**
 * Default export for dynamic imports
 */
export default todoWrite
