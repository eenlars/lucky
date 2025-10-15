/**
 * File saving utilities (stateless, config-independent)
 */

import fs from "node:fs"
import path from "node:path"
import { JSONN } from "../../index"

/**
 * Save data to an explicit filesystem path, but treat ANY leading slash
 * as project‐root‐relative.
 *
 * @param filePath   Absolute or project‐relative, e.g. "/src/x.txt" or "build/x.json"
 * @param data       string | Buffer | any JSON‐serializable
 */
export function saveInLoc<T = any>(filePath: string, data: T): void {
  // 1) Resolve against your project root (where you ran `node …`)
  // Leading slashes are treated as project-relative, not filesystem-absolute
  const isLeadingSlash = /^[/\\]/.test(filePath)
  const fullPath =
    !isLeadingSlash && path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath.replace(/^[/\\]+/, ""))

  // 2) Make any missing directories
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })

  const is_json = JSONN.isJSON(data)

  const parsed = is_json ? JSONN.extract(data) : data

  // 4) Write out Buffer, string or JSON
  const toWrite = is_json
    ? JSON.stringify(parsed, null, 2)
    : Buffer.isBuffer(data) || typeof data === "string"
      ? data
      : String(data)

  fs.writeFileSync(fullPath, toWrite)
}
