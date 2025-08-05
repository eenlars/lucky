import { codeToolAutoDiscovery } from "@core/tools/code/AutoDiscovery"
import type { FlexibleToolDefinition } from "@core/tools/code/CodeToolRegistry"

/**
 * Code Tools Implementation Directory
 *
 * This is the implementation area where actual tools are created.
 * The auto-discovery framework is in @core/tools/code/AutoDiscovery
 *
 * This file provides convenient re-exports for easy usage.
 */

/**
 * Convenience function for auto-setup
 * Uses the core framework's auto-discovery system
 */
export async function setupCodeTools(): Promise<FlexibleToolDefinition[]> {
  return await codeToolAutoDiscovery.setupCodeTools()
}

/**
 * Manual tool discovery (for testing/debugging)
 * Uses the core framework's auto-discovery system
 */
export async function discoverTools(): Promise<FlexibleToolDefinition[]> {
  return await codeToolAutoDiscovery.discoverTools()
}

// re-export the auto-discovery instance for advanced usage
export { codeToolAutoDiscovery }
