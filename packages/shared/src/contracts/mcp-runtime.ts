import { z } from "zod"

/**
 * Runtime MCP toolkit contracts for execution context.
 * Defines how MCP server configurations are carried through the execution pipeline.
 */

// ============================================================================
// TRANSPORT SPECIFICATIONS
// ============================================================================

/**
 * Stdio transport specification
 * Used for spawning MCP servers as child processes
 */
export const mcpTransportStdioSpecSchema = z.object({
  command: z.string().describe("Executable command (e.g., 'npx', 'python', '/path/to/binary')"),
  args: z.array(z.string()).describe("Command arguments"),
  env: z.record(z.string()).optional().describe("Environment variables for the process"),
})

export type MCPTransportStdioSpec = z.infer<typeof mcpTransportStdioSpecSchema>

/**
 * Transport union (stdio only for now; ws/http reserved)
 */
export const mcpTransportSpecSchema = z.object({
  kind: z.literal("stdio"),
  spec: mcpTransportStdioSpecSchema,
})

export type MCPTransportSpec = z.infer<typeof mcpTransportSpecSchema>

// ============================================================================
// TOOLKIT DEFINITIONS
// ============================================================================

/**
 * Runtime MCP toolkit
 * Represents an MCP server binding available during workflow execution
 */
export const mcpToolkitSchema = z.object({
  /**
   * Transport specification for connecting to the MCP server
   * The tools layer will create the actual transport from this spec
   */
  transport: mcpTransportSpecSchema.optional(),

  /**
   * Optional pre-fetched tool definitions
   * If provided, can speed up initialization by skipping client.tools() fetch
   */
  tools: z.record(z.any()).optional(),
})

export type MCPToolkit = z.infer<typeof mcpToolkitSchema>

/**
 * Map of toolkit names to toolkit configurations
 * Keys match MCP tool names from TOOLS.mcp
 */
export const mcpToolkitMapSchema = z.record(z.string(), mcpToolkitSchema)

export type MCPToolkitMap = z.infer<typeof mcpToolkitMapSchema>

// ============================================================================
// EXECUTION CONTEXT
// ============================================================================

/**
 * MCP context carried through workflow execution
 * Contains all MCP toolkits available to the workflow
 */
export const executionMCPContextSchema = z.object({
  toolkits: mcpToolkitMapSchema,
})

export type ExecutionMCPContext = z.infer<typeof executionMCPContextSchema>

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convert UI MCP server config to runtime toolkit
 */
export function uiConfigToToolkit(config: {
  command: string
  args: string[]
  env?: Record<string, string>
}): MCPToolkit {
  return {
    transport: {
      kind: "stdio",
      spec: {
        command: config.command,
        args: config.args,
        env: config.env ?? {},
      },
    },
  }
}

/**
 * Convert UI MCP servers config to toolkit map
 */
export function uiConfigToToolkits(
  mcpServers: Record<string, { command: string; args: string[]; env?: Record<string, string> }>,
): MCPToolkitMap {
  return Object.fromEntries(Object.entries(mcpServers).map(([name, config]) => [name, uiConfigToToolkit(config)]))
}

/**
 * Validate toolkit map
 */
export function validateToolkitMap(data: unknown): MCPToolkitMap {
  return mcpToolkitMapSchema.parse(data)
}
