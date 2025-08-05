import {
  browserAutomation,
  inputSchemaBrowserAutomation,
} from "@/code_tools/browser-automation/main"
import { defineTool } from "@core/tools/toolFactory"

/**
 * browser automation tool for web interactions
 */
const browserAutomationTool = defineTool({
  name: "browserAutomation",
  params: inputSchemaBrowserAutomation,
  async execute(params) {
    const response = await browserAutomation(params as any)

    if (!response.success) {
      throw new Error(response.error || "Browser automation failed")
    }

    return response.output || { success: true }
  },
})

export const tool = browserAutomationTool
