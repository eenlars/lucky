// verify the toolsInformation is valid

import { ACTIVE_CODE_TOOL_NAMES, type CodeToolName } from "@core/tools/tool.types"
import type { VerificationErrors } from "@core/utils/validation/workflow/verify.types"

export type ToolsInformation = Record<CodeToolName, any>

export const verifyToolsInformation = (toolsInformation: ToolsInformation | undefined): VerificationErrors => {
  if (typeof toolsInformation !== "object" || toolsInformation === null) {
    return ["toolsInformation is not an object or null"]
  }
  // verify the toolsInformation is valid
  for (const tool of Object.keys(toolsInformation)) {
    if (!ACTIVE_CODE_TOOL_NAMES.includes(tool as CodeToolName)) {
      return [`Tool ${tool} is not valid`]
    }
  }
  return []
}

export const isValidToolInformation = (data: unknown): data is Record<CodeToolName, any> => {
  return verifyToolsInformation(data as Record<CodeToolName, any>).length === 0
}
