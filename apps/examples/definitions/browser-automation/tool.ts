import { browserAutomation, inputSchemaBrowserAutomation } from "@examples/definitions/browser-automation/main"
import { defineTool } from "@lucky/tools"

/**
 * browser automation tool for web interactions
 */
const browserAutomationTool = defineTool({
  name: "browserAutomation",
  description:
    "Capture network traffic and page data from URLs. Monitors HTTP requests/responses, filters by resource type, saves response bodies. CANNOT: interact with pages (no clicking/typing), handle dynamic content requiring user actions, bypass authentication, or execute custom scripts.",
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
