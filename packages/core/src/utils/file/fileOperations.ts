import fs from "fs"
import path from "path"
import { nanoid } from "nanoid"
import { getPaths } from "@utils/config/runtimeConfig"

/**
 * Save data to an explicit filesystem path
 */
export function saveInLoc<T = any>(filePath: string, data: T): void {
  const fullPath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath.replace(/^[/\\]+/, ""))
  
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  
  const toWrite = Buffer.isBuffer(data) || typeof data === "string"
    ? data
    : JSON.stringify(data, null, 2)
  
  fs.writeFileSync(fullPath, toWrite)
}

/**
 * Save data in the logging directory with auto-generated filename
 */
export async function saveInLogging(
  data: any,
  filename?: string,
  fileExtension?: string
): Promise<string> {
  if (!filename) {
    filename = nanoid()
  } else {
    filename = filename + "-" + nanoid()
  }
  
  filename = filename.replace(/[^a-zA-Z0-9-]/g, "-")
  
  const folder = path.join(getPaths().node.logging, "saveInLogging")
  fs.mkdirSync(folder, { recursive: true })
  const fullPath = path.join(folder, `${filename + (fileExtension ?? ".json")}`)
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2))
  return fullPath
}