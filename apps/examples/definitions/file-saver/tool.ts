import { saveFileInLoc } from "@examples/definitions/file-saver/save"
import { commonSchemas, defineTool } from "@lucky/tools"
import { z } from "zod"

/**
 * Simple file saver tool using the new defineTool approach
 */
const fileSaver = defineTool({
  name: "saveFileLegacy",
  description:
    "Save any data to a file at specified path, creates directories if needed. LIMITS: restricted to accessible filesystem paths, overwrites existing files without warning, no append mode",
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
