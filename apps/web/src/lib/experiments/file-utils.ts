import { promises as fs } from "node:fs"
import path from "node:path"

export const ADAPTIVE_RESULTS_URL =
  "https://qnvprftdorualkdyogka.supabase.co/storage/v1/object/public/experiments/adaptive-results.json"

export async function getLatestFileByPrefix(baseDirAbsolutePath: string, prefix: string): Promise<string | null> {
  try {
    const entries = await fs.readdir(baseDirAbsolutePath)
    const candidates = entries
      .filter(fileName => fileName.startsWith(prefix) && fileName.endsWith(".json"))
      .map(fileName => path.join(baseDirAbsolutePath, fileName))

    if (candidates.length === 0) return null

    const stats = await Promise.all(
      candidates.map(async absolutePath => {
        try {
          const stat = await fs.stat(absolutePath)
          return { filePath: absolutePath, mtimeMs: stat.mtimeMs }
        } catch {
          return { filePath: absolutePath, mtimeMs: 0 }
        }
      }),
    )
    stats.sort((a, b) => b.mtimeMs - a.mtimeMs)
    return stats[0]?.filePath ?? null
  } catch {
    return null
  }
}

export async function getLatestFileByPrefixes(baseDirAbsolutePath: string, prefixes: string[]): Promise<string | null> {
  try {
    const entries = await fs.readdir(baseDirAbsolutePath)
    const candidates = entries
      .filter(fileName => prefixes.some(p => fileName.startsWith(p)))
      .filter(fileName => fileName.endsWith(".json"))
      .map(fileName => path.join(baseDirAbsolutePath, fileName))

    if (candidates.length === 0) return null

    const stats = await Promise.all(
      candidates.map(async absolutePath => {
        try {
          const stat = await fs.stat(absolutePath)
          return { filePath: absolutePath, mtimeMs: stat.mtimeMs }
        } catch {
          return { filePath: absolutePath, mtimeMs: 0 }
        }
      }),
    )
    stats.sort((a, b) => b.mtimeMs - a.mtimeMs)
    return stats[0]?.filePath ?? null
  } catch {
    return null
  }
}

export async function readJsonLocal<T>(absolutePath: string): Promise<T> {
  const raw = await fs.readFile(absolutePath, "utf-8")
  try {
    return JSON.parse(raw)
  } catch (error) {
    throw new Error(`Invalid JSON in file ${absolutePath}: ${error}`)
  }
}

export async function readJsonRemote<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Error(`Invalid JSON from URL ${url}: ${error}`)
  }
}

export async function loadJsonProdOrLocal<T>(
  prodUrl: string,
  localAbsolutePath: string,
): Promise<{
  json: T | null
  source: "remote" | "local" | "none"
  file: string | null
  error?: string
}> {
  // Try remote first only in production
  if (process.env.NODE_ENV === "production") {
    try {
      const json = await readJsonRemote<T>(prodUrl)
      return { json, source: "remote", file: prodUrl }
    } catch (_e: any) {
      // fall through to local
      // include error for observability
    }
  }

  try {
    const json = await readJsonLocal<T>(localAbsolutePath)
    return { json, source: "local", file: localAbsolutePath }
  } catch (e: any) {
    return {
      json: null,
      source: "none",
      file: null,
      error: e?.message ?? String(e),
    }
  }
}

export function publicExperimentDir(...segments: string[]): string {
  return path.resolve(process.cwd(), path.join("public/research-experiments/tool-real/experiments", ...segments))
}
