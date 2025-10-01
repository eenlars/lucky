import { isVercelAIStructure, isZodSchema } from "@core/tools/utils/schemaDetection"
import { isNir } from "@lucky/shared"
import { llmify } from "@core/utils/common/llmify"
import { zodToJson } from "@core/utils/zod/zodToJson"
import { CONFIG } from "@core/core-config/compat"
import type { ToolSet } from "ai"

export function explainTools(tools: ToolSet): string {
  if (isNir(tools)) {
    return "No tools provided"
  }

  // Read configuration at call-time so tests can toggle it between runs
  const argsEnabled = CONFIG.tools.showParameterSchemas
  // Always include description per tests/UX
  const descriptionEnabled = true

  const toolKeys = Object.keys(tools) as (keyof ToolSet)[]
  const fullToolListWithArgs = toolKeys
    .map(key => {
      const tool = tools[key]
      const params = tool.inputSchema

      let argsString = "not shown"
      if (argsEnabled) {
        if (isVercelAIStructure(params)) {
          argsString = JSON.stringify(params.jsonSchema)
        } else if (isZodSchema(params)) {
          try {
            argsString = zodToJson(params as any)
          } catch {
            argsString = params ? JSON.stringify(params) : "{}"
          }
        } else {
          // Gracefully handle missing params
          argsString = params ? JSON.stringify(params) : "{}"
        }
      }

      const description = descriptionEnabled ? tool.description : "not shown"

      return `Tool: ${String(key)}\nDescription: ${description}\nArgs: ${argsString}`
    })
    .join("\n")

  return llmify(fullToolListWithArgs)
}
