import { getCoreConfig } from "@core/core-config/coreConfig"
const config = getCoreConfig()
import { saveInLoc } from "@core/utils/fs/fileSaver"
import type { GenerateTextResult, ToolSet } from "ai"

export async function saveResultOutput(result: GenerateTextResult<ToolSet, any>): Promise<void> {
  const path = `${config.paths.node.logging}/raw-responses/vercel-output-${new Date().toISOString().replace(/:/g, "-")}.json`
  saveInLoc(path, JSON.stringify(result))
}
