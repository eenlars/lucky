import { isNir } from "@lucky/shared"

import { printValidationResult, validateToolkitRegistration } from "../registration/validation"
import type { ToolkitDefinition } from "../registration/customToolsRegistration"
import { type CodeToolRegistry, codeToolRegistry } from "./CustomToolRegistry"
import type { CodeToolName } from "./types"

/**
 * Ensures that code toolkits are registered before a node initializes them.
 *
 * When the registry is empty (common in standalone workflows that skip
 * explicit startup wiring), we attempt to lazily register the example
 * toolkits. If registration fails we surface a descriptive error so
 * callers can address the misconfiguration instead of silently hanging.
 */
export async function ensureCodeToolsRegistered(
  toolNames: CodeToolName[],
  registry: CodeToolRegistry = codeToolRegistry,
): Promise<void> {
  if (isNir(toolNames)) return
  const { initialized, totalTools } = registry.getStats()
  if (initialized && totalTools > 0) return

  if (totalTools > 0) {
    // Some tools are registered but registry was not initialized yet; the
    // caller will handle initialization immediately after this helper.
    return
  }

  await registry.ensureDefaultTools(
    async () => {
      try {
        const { TOOL_TOOLKITS } = await import("@examples/definitions/registry-grouped")
        return TOOL_TOOLKITS.toolkits
      } catch (error) {
        const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
        throw new Error(`Failed to load default code tools. Reason: ${reason}`)
      }
    },
    {
      validate: (toolkits: ToolkitDefinition<"code">[]) => {
        const result = validateToolkitRegistration(toolkits)
        printValidationResult("Code", result)
        if (!result.valid) {
          throw new Error("Code toolkit validation failed")
        }
      },
    },
  )
}
