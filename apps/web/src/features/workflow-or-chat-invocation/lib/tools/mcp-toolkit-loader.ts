import type { Principal } from "@/lib/auth/principal"
import { loadMCPToolkitsFromDatabase } from "@/lib/mcp/database-toolkit-loader"
import type { MCPToolkitMap } from "@lucky/shared"

/**
 * Load MCP toolkits for workflow execution from database.
 * Only loads for session-authenticated users in non-production environments.
 *
 * @param principal - The authenticated principal (user/API key)
 * @returns MCP toolkit map or undefined if no toolkits found
 */
export async function loadMCPToolkitsForWorkflow(principal: Principal): Promise<MCPToolkitMap | undefined> {
  // Only load MCP toolkits for session auth in non-production
  if (principal.auth_method !== "session" || process.env.NODE_ENV === "production") {
    return undefined
  }

  try {
    const mcpToolkits = await loadMCPToolkitsFromDatabase(principal.clerk_id)

    if (!mcpToolkits) {
      console.log("[mcp-toolkit-loader] No MCP configs found in database")
    }

    return mcpToolkits
  } catch (error) {
    console.warn("[mcp-toolkit-loader] Failed to load MCP configs, continuing without toolkits:", error)
    return undefined
  }
}
