import { zodToJson } from "@core/messages/utils/zodToJson"
import {
  isVercelAIStructure,
  isZodSchema,
} from "@core/tools/utils/schemaDetection"
import { isNir } from "@core/utils/common/isNir"
import { llmify } from "@core/utils/common/llmify"
import { CONFIG } from "@runtime/settings/constants"
import type { ToolSet } from "ai"

const argsEnabled = CONFIG.tools.showParameterSchemas
const descriptionEnabled = false

export function explainTools(tools: ToolSet): string {
  if (isNir(tools)) {
    return "No tools provided"
  }

  const toolKeys = Object.keys(tools) as (keyof ToolSet)[]
  const fullToolListWithArgs = toolKeys
    .map((key) => {
      const tool = tools[key]
      const params = tool.parameters

      let argsString = "not shown"
      if (argsEnabled) {
        if (isVercelAIStructure(params)) {
          argsString = JSON.stringify(params.jsonSchema)
        } else if (isZodSchema(params)) {
          argsString = zodToJson(params)
        } else {
          argsString = JSON.stringify(params)
        }
      }

      const description = descriptionEnabled ? tool.description : "not shown"

      return `Tool: ${String(key)}\nDescription: ${description}\nArgs: ${argsString}`
    })
    .join("\n")

  return llmify(fullToolListWithArgs)
}
