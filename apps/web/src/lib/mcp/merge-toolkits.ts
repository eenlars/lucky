/**
 * Merge MCP toolkit configurations from multiple sources
 * Database configs take precedence over lockbox configs
 */

import type { MCPToolkitMap } from "@lucky/shared"

/**
 * Merge toolkit configs from database and lockbox
 * Database configs take precedence (overwrite lockbox)
 */
export function mergeMCPToolkits(
  databaseToolkits: MCPToolkitMap | undefined,
  lockboxToolkits: MCPToolkitMap | undefined,
): MCPToolkitMap | undefined {
  // If both exist, merge with database taking precedence
  if (databaseToolkits && lockboxToolkits) {
    const merged = { ...lockboxToolkits, ...databaseToolkits }
    const dbNames = Object.keys(databaseToolkits)
    const lockboxNames = Object.keys(lockboxToolkits)
    const allNames = Object.keys(merged)

    if (dbNames.length > 0 && lockboxNames.length > 0) {
      const overridden = dbNames.filter(name => lockboxNames.includes(name))
      if (overridden.length > 0) {
        console.log(`[mergeMCPToolkits] Database configs override lockbox for: ${overridden.join(", ")}`)
      }
    }

    console.log("[mergeMCPToolkits] Merged MCP toolkits:", allNames)
    return merged
  }

  // If only one exists, use it
  if (databaseToolkits) {
    console.log("[mergeMCPToolkits] Using database MCP toolkits:", Object.keys(databaseToolkits))
    return databaseToolkits
  }

  if (lockboxToolkits) {
    console.log("[mergeMCPToolkits] Using lockbox MCP toolkits:", Object.keys(lockboxToolkits))
    return lockboxToolkits
  }

  // Neither exists
  console.log("[mergeMCPToolkits] No MCP toolkits from either source")
  return undefined
}
