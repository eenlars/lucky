// persist.ts
// Drop this anywhere; call persist(finalConfig, analysisResult?)

import { mkdirIfMissing, writeJsonAtomic } from "@core/utils/common/files"
import { lgg } from "@core/utils/logging/Logger"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import type { Json } from "@lucky/shared"
import { PATHS } from "@runtime/settings/constants"
import path from "path"

/**
 * Persist finalConfig and (optionally) analysisResult.
 * – Always overwrites the "live" copy.
 * – Also drops a timestamped backup alongside it (unless skipBackup is true).
 */
//todo-leak :: Persistence function accessed by both evaluation and improvement without access controls
export async function persistWorkflow(
  finalConfig: Json | WorkflowConfig,
  fileName: string = "setupfile.json",
  skipBackup: boolean = false
): Promise<void> {
  // compute directories at runtime to respect test overrides
  const OUT_DIR = path.dirname(path.resolve(PATHS.setupFile))
  const BACKUP_DIR = path.join(PATHS.node.logging, "backups")

  await mkdirIfMissing(OUT_DIR)
  await mkdirIfMissing(BACKUP_DIR)

  const finalConfigJson = finalConfig as Json

  const stamp = new Date().toISOString().replace(/[:.]/g, "-")

  // ----- 1. save finalConfig -----
  // Save to setup folder (use OUT_DIR which resolves to setupFile directory)
  const filename = path.basename(fileName)
  const configPath = path.join(OUT_DIR, filename)

  await writeJsonAtomic(configPath, finalConfigJson)

  // Create backup unless skipBackup is true
  if (!skipBackup) {
    const backupName = path.basename(fileName, path.extname(fileName))

    await writeJsonAtomic(path.join(BACKUP_DIR, `${backupName}_${stamp}.json`), finalConfigJson)

    lgg.log(`✅ persisted + backed up ${configPath}`)
  } else {
    lgg.log(`✅ persisted ${configPath} (backup skipped)`)
  }
}
