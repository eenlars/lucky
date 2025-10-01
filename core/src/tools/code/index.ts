/**
 * Code Tools Framework - Main Entry Point
 *
 * This module provides the public API for the code tools framework,
 * including registry management and tool creation utilities.
 *
 * Tools are now registered via the registration file in @lucky/tools
 * instead of auto-discovery.
 */

import { codeToolRegistry } from "@lucky/tools"

// core framework components
export { CodeToolRegistry, codeToolRegistry } from "@lucky/tools"
export type { FlexibleToolDefinition } from "@lucky/tools"

// main API functions
export async function initializeCodeTools(): Promise<void> {
  await codeToolRegistry.initialize()
}
