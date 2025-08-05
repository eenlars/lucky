import { getPaths } from "@utils/config/runtimeConfig"
import { saveInLoc } from "@utils/file/fileOperations"
import type { GenerateTextResult, ToolSet } from "ai"

export async function saveResultOutput(
  result: GenerateTextResult<ToolSet, any>
): Promise<void> {
  const savePath = `${getPaths().node.logging}/raw-responses/vercel-output-${new Date().toISOString().replace(/:/g, "-")}.json`
  saveInLoc(savePath, JSON.stringify(result))
}
