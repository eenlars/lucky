import { isNir } from "@utils/common/isNir"
import type { CodeToolName } from "@tools/tool.types"
import type { ToolExecutionContext } from "@tools/toolFactory"
import type { Tool, ToolSet } from "ai"
import { codeToolRegistry } from "./index"

/**
 * Initialize the code tool registry
 */
await codeToolRegistry.initialize()

/**
 * Code-specific tool setup that accepts workflowInvocationId for context injection
 */
export const setupCodeToolsForNode = async (
  toolNames: CodeToolName[],
  toolExecutionContext?: ToolExecutionContext
): Promise<ToolSet> => {
  if (isNir(toolNames)) {
    return {}
  }

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
    {} as Record<string, Tool>
  )
}
