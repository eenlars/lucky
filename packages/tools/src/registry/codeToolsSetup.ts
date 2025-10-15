import { isNir } from "@lucky/shared"
import type { Tool, ToolSet } from "ai"
import type { ToolExecutionContext } from "../factory/types"
import { type CodeToolRegistry, codeToolRegistry } from "./CodeToolRegistry"
import { ensureCodeToolsRegistered } from "./ensureCodeToolsRegistered"
import type { CodeToolName } from "./types"

/**
 * Code-specific tool setup that accepts workflowInvocationId for context injection
 */
export const setupCodeToolsForNode = async (
  toolNames: CodeToolName[],
  toolExecutionContext?: ToolExecutionContext,
  options?: { registry?: CodeToolRegistry },
): Promise<ToolSet> => {
  if (isNir(toolNames)) {
    return {}
  }

  const registry = options?.registry ?? codeToolRegistry

  await ensureCodeToolsRegistered(toolNames, registry)

  // initialize the code tool registry
  await registry.initialize()

  // Get tools with context if workflowInvocationId is provided
  if (!toolExecutionContext) {
    // Return empty during setup phase, tools will be initialized later
    return {}
  }
  const toolRegistry = registry.getToolRegistry(toolExecutionContext)

  return toolNames.reduce(
    (acc, toolName) => {
      if (toolRegistry[toolName]) {
        acc[toolName] = toolRegistry[toolName]
      }
      return acc
    },
    {} as Record<string, Tool>,
  )
}
