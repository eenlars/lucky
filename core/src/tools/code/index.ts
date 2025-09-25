/**
 * Code Tools Framework - Main Entry Point
 *
 * This module provides the public API for the code tools framework,
 * including auto-discovery, registry management, and tool creation utilities.
 */

import { codeToolAutoDiscovery } from "@core/tools/code/AutoDiscovery"
import { codeToolRegistry } from "@core/tools/code/CodeToolRegistry"

// core framework components
export { CodeToolAutoDiscovery, codeToolAutoDiscovery } from "@core/tools/code/AutoDiscovery"
export { CodeToolRegistry, codeToolRegistry } from "@core/tools/code/CodeToolRegistry"
export type { FlexibleToolDefinition } from "@core/tools/code/CodeToolRegistry"

// main API functions
export async function setupCodeTools(): Promise<import("@core/tools/code/CodeToolRegistry").FlexibleToolDefinition[]> {
  return await codeToolAutoDiscovery.setupCodeTools()
}

export async function discoverTools(): Promise<import("@core/tools/code/CodeToolRegistry").FlexibleToolDefinition[]> {
  return await codeToolAutoDiscovery.discoverTools()
}

export async function initializeCodeTools(): Promise<void> {
  await codeToolRegistry.initialize()
}
