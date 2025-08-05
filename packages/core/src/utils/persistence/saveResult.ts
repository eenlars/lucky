import { saveInLoc } from "@example/code_tools/file-saver/save"
import { getPaths } from "@utils/config/runtimeConfig"
import type { GenerateTextResult, ToolSet } from "ai"

export async function saveResultOutput(
  result: GenerateTextResult<ToolSet, any>
): Promise<void> {
  const path = `${getPaths().node.logging}/raw-responses/vercel-output-${new Date().toISOString().replace(/:/g, "-")}.json`
  saveInLoc(path, JSON.stringify(result))
}
