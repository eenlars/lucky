import { isNir } from "@lucky/shared"

import { registerAllTools } from "../registration/startup"
import { codeToolRegistry } from "./CodeToolRegistry"
import type { CodeToolName } from "./types"

let registrationPromise: Promise<void> | null = null

/**
 * Ensures that code tools are registered before a node initializes them.
 *
 * When the registry is empty (common in standalone workflows that skip
 * explicit startup wiring), we attempt to lazily register the example
 * tool groups. If registration fails we surface a descriptive error so
 * callers can address the misconfiguration instead of silently hanging.
 */
export async function ensureCodeToolsRegistered(toolNames: CodeToolName[]): Promise<void> {
  if (isNir(toolNames)) return

  const { initialized, totalTools } = codeToolRegistry.getStats()
  if (initialized && totalTools > 0) return

  if (totalTools > 0) {
    // Some tools are registered but registry was not initialized yet; the
    // caller will handle initialization immediately after this helper.
    return
  }

  if (registrationPromise) {
    await registrationPromise
    return
  }

  registrationPromise = (async () => {
    try {
      const { TOOL_GROUPS } = await import("@examples/definitions/registry-grouped")

      await registerAllTools(TOOL_GROUPS, {
        validate: true,
        throwOnError: true,
      })
    } catch (error) {
      const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
      throw new Error(`Failed to auto-register code tools. Reason: ${reason}`)
    }
  })()

  await registrationPromise
}
