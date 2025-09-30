import { saveFileInLoc } from "@examples/code_tools/file-saver/save"
import { commonSchemas, defineTool } from "@core/tools/toolFactory"
import { z } from "zod"

/**
 * Simple file saver tool using the new defineTool approach
 */
const fileSaver = defineTool({
  name: "saveFileLegacy",
  params: z.object({
    filePath: commonSchemas.filePath,
    data: commonSchemas.data,
  }),
  async execute(params) {
    const response = await saveFileInLoc(params.filePath, params.data)
    // Extract the actual result from the CodeToolResult format
    return response.output || { success: true, data: params.data }
  },
})

export const tool = fileSaver
