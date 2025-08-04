/**
 * Initialize core package with runtime configuration
 * This proves the model configuration works end-to-end
 */

import { initializeCoreRuntime } from "./runtime/core-consumer"

// Call this once during app startup
export function initializeCore(): void {
  initializeCoreRuntime()
  console.log("✅ Core package initialized with runtime configuration")
}