import { isNir } from "@lucky/shared"
import type { Tool, ToolSet } from "ai"
import type { ToolExecutionContext } from "../factory/types"
import { codeToolRegistry } from "./CodeToolRegistry"
import { ensureCodeToolsRegistered } from "./ensureCodeToolsRegistered"
import type { CodeToolName } from "./types"

/**
 * Code-specific tool setup that accepts workflowInvocationId for context injection
 */
export const setupCodeToolsForNode = async (
  toolNames: CodeToolName[],
  toolExecutionContext?: ToolExecutionContext,
): Promise<ToolSet> => {
  if (isNir(toolNames)) {
    return {}
  }

  await ensureCodeToolsRegistered(toolNames)

  // initialize the code tool registry
  await codeToolRegistry.initialize()

  // Get tools with context if workflowInvocationId is provided
  if (!toolExecutionContext) {
    // Return empty during setup phase, tools will be initialized later
    return {}
  }
  const toolRegistry = codeToolRegistry.getToolRegistry(toolExecutionContext)

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
