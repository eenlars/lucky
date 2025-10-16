/**
 * File saving utilities for core.
 * - saveInLoc is re-exported from @lucky/shared
 * - Other utilities (save, saveInLogging) have core dependencies and remain here
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { getCorePaths } from "@core/core-config/coreConfig"
import { nanoid } from "nanoid"

// Re-export saveInLoc from shared (direct subpath import to avoid browser bundle issues)
export { saveInLoc } from "@lucky/shared/utils/fs/fileSaver"

function getCallerDir(): string {
  if (typeof window !== "undefined") {
    return path.dirname(import.meta.url)
  }

  const orig = Error.prepareStackTrace
  Error.prepareStackTrace = (_, stack) => stack
  const err = new Error()
  const stack = err.stack as unknown as NodeJS.CallSite[]
  Error.prepareStackTrace = orig

  let callerFile = stack[2].getFileName()
  if (!callerFile) {
    throw new Error("Could not determine caller filename")
  }
  if (callerFile.startsWith("file://")) {
    callerFile = fileURLToPath(callerFile)
  }
  return path.dirname(callerFile)
}

/**
 * Save data next to the file that calls this.
 * e.g. save("out.txt", …) from src/foo/bar.ts will write to src/foo/out.txt
 */
export function save<T = any>(filename: string, data: T): void {
  const dir = getCallerDir()
  fs.mkdirSync(dir, { recursive: true })

  const fullPath = path.join(dir, filename)
  const toWrite = Buffer.isBuffer(data) || typeof data === "string" ? data : JSON.stringify(data, null, 2)

  fs.writeFileSync(fullPath, toWrite)
}

export async function saveInLogging(data: any, filename?: string, fileExtension?: string): Promise<string> {
  const baseFilename = !filename ? nanoid() : `${filename}-${nanoid()}`

  // make sure the filename only contains alphanumeric characters
  const sanitizedFilename = baseFilename.replace(/[^a-zA-Z0-9-]/g, "-")

  // save in the logging folder - use core config paths
  const paths = getCorePaths()
  const folder = path.join(paths.node.logging, "saveInLogging")
  fs.mkdirSync(folder, { recursive: true })
  const fullPath = path.join(folder, `${sanitizedFilename + (fileExtension ?? ".json")}`)
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2))
  return fullPath
}
