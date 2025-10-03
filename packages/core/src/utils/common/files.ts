import type { Json } from "@lucky/shared"

// Server-side only functions - will throw error if used in client
export async function mkdirIfMissing(p: string) {
  if (typeof window !== "undefined") {
    throw new Error("mkdirIfMissing can only be used on server-side")
  }
  const fs = await import("node:fs")
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

export async function writeJsonAtomic(filePath: string, data: Json) {
  if (typeof window !== "undefined") {
    throw new Error("writeJsonAtomic can only be used on server-side")
  }
  const fs = await import("node:fs")
  const tmp = `${filePath}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, filePath) // atomic on POSIX filesystems
}
