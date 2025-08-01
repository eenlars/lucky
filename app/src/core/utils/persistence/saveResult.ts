import { saveInLoc } from "@/runtime/code_tools/file-saver/save"
import { PATHS } from "@/runtime/settings/constants"
import type { GenerateTextResult, ToolSet } from "ai"

export async function saveResultOutput(
  result: GenerateTextResult<ToolSet, any>
): Promise<void> {
  const path = `${PATHS.node.logging}/raw-responses/vercel-output-${new Date().toISOString().replace(/:/g, "-")}.json`
  saveInLoc(path, JSON.stringify(result))
}
