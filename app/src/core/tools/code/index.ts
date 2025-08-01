/**
 * Code Tools Framework - Main Entry Point
 *
 * This module provides the public API for the code tools framework,
 * including auto-discovery, registry management, and tool creation utilities.
 */

import { codeToolAutoDiscovery } from "@tools/code/AutoDiscovery"
import { codeToolRegistry } from "@tools/code/CodeToolRegistry"

// core framework components
export {
  CodeToolAutoDiscovery,
  codeToolAutoDiscovery,
} from "@tools/code/AutoDiscovery"
export {
  CodeToolRegistry,
  codeToolRegistry,
} from "@tools/code/CodeToolRegistry"
export type { FlexibleToolDefinition } from "@tools/code/CodeToolRegistry"

// main API functions
export async function setupCodeTools(): Promise<
  import("@tools/code/CodeToolRegistry").FlexibleToolDefinition[]
> {
  return await codeToolAutoDiscovery.setupCodeTools()
}

export async function discoverTools(): Promise<
  import("@tools/code/CodeToolRegistry").FlexibleToolDefinition[]
> {
  return await codeToolAutoDiscovery.discoverTools()
}

export async function initializeCodeTools(): Promise<void> {
  await codeToolRegistry.initialize()
}
