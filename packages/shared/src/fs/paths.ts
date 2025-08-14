import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

function fromHere(
  relativePath: string,
  meta: string = import.meta.url
): string {
  const baseDirectory = path.dirname(fileURLToPath(meta))
  // If an absolute path is provided, use it as-is to support callers that
  // resolve paths outside of the module tree (e.g., workspace-level abs paths).
  if (path.isAbsolute(relativePath)) return relativePath
  return path.join(baseDirectory, relativePath)
}

export async function readText(
  relativePath: string,
  meta: string = import.meta.url
): Promise<string> {
  return readFile(fromHere(relativePath, meta), "utf8")
}

export async function readJson<T = unknown>(
  relativePath: string,
  meta: string = import.meta.url
): Promise<T> {
  const text = await readText(relativePath, meta)
  return JSON.parse(text) as T
}
