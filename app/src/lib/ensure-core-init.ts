/**
 * Ensures core is initialized before use.
 * Safe to call multiple times - only initializes once.
 * Should be called at the start of API routes that use core functionality.
 */
import { initCore } from "@/lib/core-init"

let isInitialized = false

export function ensureCoreInit(): void {
  if (isInitialized) return
  initCore()
  isInitialized = true
}
