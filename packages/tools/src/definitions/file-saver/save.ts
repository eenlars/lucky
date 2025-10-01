// save.ts
import type { CodeToolResult } from "@lucky/tools"
import { PATHS } from "../../config/runtime"
import { JSONN } from "@lucky/shared"
import fs from "fs"
import { nanoid } from "nanoid"
import path from "path"
import { fileURLToPath } from "url"

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

/**
 * Save data to an explicit filesystem path, but treat ANY leading slash
 * as project‐root‐relative.
 *
 * @param filePath   Absolute or project‐relative, e.g. "/src/x.txt" or "build/x.json"
 * @param data       string | Buffer | any JSON‐serializable
 */
export function saveInLoc<T = any>(filePath: string, data: T): void {
  // 1) Resolve against your project root (where you ran `node …`)
  const fullPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath.replace(/^[/\\]+/, ""))

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

export async function saveFile(
  filename: string,
  data: string,
): Promise<CodeToolResult<{ success: boolean; data: string }>> {
  save(filename, data)
  return {
    success: true,
    tool: "saveFileLegacy",
    output: {
      success: true,
      data: data,
    },
    error: null,
  }
}

export async function saveFileInLoc(
  filePath: string,
  data: string,
): Promise<CodeToolResult<{ success: boolean; data: string }>> {
  saveInLoc(filePath, data)
  return {
    success: true,
    tool: "saveFileLegacy",
    output: {
      success: true,
      data: data,
    },
    error: null,
  }
}

export async function saveInLogging(data: any, filename?: string, fileExtension?: string): Promise<string> {
  if (!filename) {
    filename = nanoid()
  } else {
    filename = filename + "-" + nanoid()
  }

  // make sure the filename only contains alphanumeric characters
  filename = filename.replace(/[^a-zA-Z0-9-]/g, "-")

  // save in the logging folder
  const folder = path.join(PATHS.node.logging, "saveInLogging")
  fs.mkdirSync(folder, { recursive: true })
  const fullPath = path.join(folder, `${filename + (fileExtension ?? ".json")}`)
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2))
  return fullPath
}
