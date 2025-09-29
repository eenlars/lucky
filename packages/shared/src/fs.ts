import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

export async function readText(relativePath: string, meta: string = import.meta.url): Promise<string> {
  const baseDir = path.dirname(fileURLToPath(meta))
  // Respect absolute paths passed by callers. Otherwise, resolve relative to this module.
  const absolutePath = path.isAbsolute(relativePath) ? relativePath : path.join(baseDir, relativePath)
  return readFile(absolutePath, "utf8")
}
