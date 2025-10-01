import { saveInLoc } from "@core/utils/fs/fileSaver"
import { PATHS } from "@core/core-config/compat"
import type { GenerateTextResult, ToolSet } from "ai"

export async function saveResultOutput(result: GenerateTextResult<ToolSet, any>): Promise<void> {
  const path = `${PATHS.node.logging}/raw-responses/vercel-output-${new Date().toISOString().replace(/:/g, "-")}.json`
  saveInLoc(path, JSON.stringify(result))
}
