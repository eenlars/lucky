/**
 * Load MCP toolkit configurations from database
 * Fetches enabled stdio-based MCP server configs from mcp.user_server_configs
 */

import { createRLSClient } from "@/lib/supabase/server-rls"
import type { MCPToolkitMap } from "@lucky/shared"
import { uiConfigToToolkits } from "@lucky/shared"

/**
 * Load MCP toolkit configs from database for a user
 * Returns MCPToolkitMap ready for execution context
 */
export async function loadMCPToolkitsFromDatabase(clerkId: string): Promise<MCPToolkitMap | undefined> {
  try {
    const supabase = await createRLSClient()

    const { data, error } = await supabase
      .schema("mcp")
      .from("user_server_configs")
      .select("name, config_json, secrets_json, enabled")
      .eq("user_id", clerkId)
      .is("server_id", null) // Only stdio servers
      .eq("enabled", true)

    if (error) {
      console.warn("[loadMCPToolkitsFromDatabase] Failed to fetch MCP configs from database:", error.message)
      return undefined
    }

    if (!data || data.length === 0) {
      console.log("[loadMCPToolkitsFromDatabase] No MCP configs found in database")
      return undefined
    }

    // Transform rows into mcpServers format
    const mcpServers: Record<string, { command: string; args: string[]; env?: Record<string, string> }> = {}

    for (const row of data) {
      const configJson = row.config_json as { command: string; args: string[] }
      const secretsJson = row.secrets_json as { env?: Record<string, string> } | null

      const config: { command: string; args: string[]; env?: Record<string, string> } = {
        command: configJson.command,
        args: configJson.args,
      }

      if (secretsJson?.env) {
        config.env = secretsJson.env
      }

      mcpServers[row.name] = config
    }

    if (Object.keys(mcpServers).length === 0) {
      console.log("[loadMCPToolkitsFromDatabase] No valid MCP configs found")
      return undefined
    }

    const toolkits = uiConfigToToolkits(mcpServers)
    console.log("[loadMCPToolkitsFromDatabase] Loaded MCP toolkits from database:", Object.keys(toolkits))
    return toolkits
  } catch (error) {
    console.warn("[loadMCPToolkitsFromDatabase] Error loading MCP configs from database:", error)
    return undefined
  }
}
