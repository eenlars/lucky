import type { CodeToolName } from "@core/tools/tool.types"
import type { ToolExecutionContext } from "@core/tools/toolFactory"
import { isNir } from "@core/utils/common/isNir"
import type { Tool, ToolSet } from "ai"
import { codeToolRegistry } from "./index"

/**
 * Code-specific tool setup that accepts workflowInvocationId for context injection
 */
export const setupCodeToolsForNode = async (
  toolNames: CodeToolName[],
  toolExecutionContext?: ToolExecutionContext,
): Promise<ToolSet> => {
  // initialize the code tool registry
  await codeToolRegistry.initialize()

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
    {} as Record<string, Tool>,
  )
}
