import { generateSummaryFromUnknownData } from "@core/messages/summaries/createSummary"
import type { ContextFileInfo } from "@core/tools/context/contextStore.types"
import { supabase } from "@core/utils/clients/supabase/client"
import { lgg } from "@core/utils/logging/Logger"
import type { ContextStore } from "@core/utils/persistence/memory/ContextStore"

export class SupabaseContextStore implements ContextStore {
  private cache = new Map<string, any>()
  private bucket = "context"
  private maxRetries = 3
  private retryDelay = 1000

  constructor(private workflowInvocationId: string) {}

  private async withRetry<T>(operation: () => Promise<T>, context: string): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        lgg.warn(`${context} failed (attempt ${attempt}/${this.maxRetries}):`, error)

        if (attempt < this.maxRetries) {
          // todo-resourceleak: setTimeout not cleaned up if promise is rejected
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt))
        }
      }
    }

    throw new Error(`${context} failed after ${this.maxRetries} attempts: ${lastError?.message}`)
  }

  private makePath(scope: "workflow" | "node", key: string): string {
    return `${this.workflowInvocationId}/${scope}/${key}`
  }

  private async createDirectory<T>(scope: "workflow" | "node", key: string, value: T): Promise<void> {
    const basePath = this.makePath(scope, key)
    const now = new Date().toISOString()

    // Prepare data content and determine content type
    let dataContent: string | Blob
    let contentType: string
    let dataType: string
    let size: number

    if (value instanceof Blob) {
      // Handle Blob data
      dataContent = value
      contentType = value?.type || "application/octet-stream"
      dataType = "blob"
      size = value?.size ?? 0
    } else if (value instanceof ArrayBuffer) {
      // Handle ArrayBuffer data
      dataContent = new Blob([value])
      contentType = "application/octet-stream"
      dataType = "arraybuffer"
      size = value?.byteLength ?? 0
    } else if (typeof value === "string") {
      // Handle string data
      dataContent = value
      contentType = "text/plain"
      dataType = "string"
      size = new Blob([value]).size
    } else {
      // Handle JSON-serializable data
      dataContent = JSON.stringify(value, null, 2)
      contentType = "application/json"
      dataType = Array.isArray(value) ? "array" : typeof value
      size = new Blob([dataContent]).size
    }

    const summaryResult = await generateSummaryFromUnknownData(value)
    const summary = summaryResult.summary

    const metadata = {
      created: now,
      modified: now,
      size,
      dataType,
      contentType,
      key,
      scope,
    }

    // Upload all files atomically with retry logic
    await this.withRetry(async () => {
      const uploads = [
        supabase.storage.from(this.bucket).upload(`${basePath}/data`, dataContent, {
          contentType,
          upsert: true,
        }),
        supabase.storage.from(this.bucket).upload(`${basePath}/summary.txt`, summary, {
          contentType: "text/plain",
          upsert: true,
        }),
        supabase.storage.from(this.bucket).upload(`${basePath}/metadata.json`, JSON.stringify(metadata, null, 2), {
          contentType: "application/json",
          upsert: true,
        }),
      ] as const

      const results = await Promise.allSettled(uploads)
      const errors = results.filter(r => r.status === "rejected")

      if (errors.length > 0) {
        throw new Error(`Failed to create directory: ${errors.map(e => e.reason).join(", ")}`)
      }
    }, `Creating directory ${basePath}`)
  }

  async get<T>(scope: "workflow" | "node", key: string): Promise<T | undefined> {
    const cacheKey = this.makePath(scope, key)

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    try {
      // First, get metadata to determine how to process the data
      const { data: metadataBlob, error: metadataError } = await supabase.storage
        .from(this.bucket)
        .download(`${cacheKey}/metadata.json`)

      let metadata: any = {}
      if (!metadataError && metadataBlob) {
        const metadataText = await metadataBlob.text()
        metadata = JSON.parse(metadataText)
      }

      const { data, error } = await supabase.storage.from(this.bucket).download(`${cacheKey}/data`)

      if (error) {
        // Don't retry if file not found - this is expected behavior
        return undefined
      }

      // Process data based on content type
      let value: T
      const contentType = metadata.contentType || "application/octet-stream"

      if (contentType === "application/json") {
        const text = await data.text()
        value = JSON.parse(text) as T
      } else if (contentType === "text/plain" || metadata.dataType === "string") {
        value = (await data.text()) as T
      } else if (metadata.dataType === "arraybuffer") {
        value = (await data.arrayBuffer()) as T
      } else if (metadata.dataType === "blob") {
        value = data as T
      } else {
        // Try to parse as JSON first, fall back to text
        const text = await data.text()
        try {
          value = JSON.parse(text) as T
        } catch {
          value = text as T
        }
      }

      this.cache.set(cacheKey, value)
      return value
    } catch (error) {
      // Only retry on unexpected errors like network issues
      if (error instanceof Error && error.message.includes("File not found")) {
        return undefined
      }

      try {
        return await this.withRetry(async () => {
          const { data, error } = await supabase.storage.from(this.bucket).download(`${cacheKey}/data`)

          if (error) throw new Error(`File not found: ${error.message}`)

          // Process data (simplified retry logic)
          const text = await data.text()
          let value: T
          try {
            value = JSON.parse(text) as T
          } catch {
            value = text as T
          }

          this.cache.set(cacheKey, value)
          return value
        }, `Getting ${cacheKey}`)
      } catch (retryError) {
        lgg.warn(`Failed to get ${cacheKey}:`, retryError)
        return undefined
      }
    }
  }

  async set<T>(scope: "workflow" | "node", key: string, value: T): Promise<void> {
    const cacheKey = this.makePath(scope, key)
    this.cache.set(cacheKey, value)

    await this.createDirectory(scope, key, value)
  }

  async delete(scope: "workflow" | "node", key: string): Promise<void> {
    const basePath = this.makePath(scope, key)

    await this.withRetry(async () => {
      // Delete all files in the directory
      const filesToDelete = [`${basePath}/data`, `${basePath}/summary.txt`, `${basePath}/metadata.json`]

      const { error } = await supabase.storage.from(this.bucket).remove(filesToDelete)
      if (error) throw new Error(`Failed to delete files: ${error.message}`)

      this.cache.delete(basePath)
    }, `Deleting directory ${basePath}`)
  }

  async getSummary(scope: "workflow" | "node", key: string): Promise<string | undefined> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucket)
        .download(`${this.makePath(scope, key)}/summary.txt`)

      if (error) return undefined
      return await data.text()
    } catch {
      return undefined
    }
  }

  async list(scope: "workflow" | "node"): Promise<string[]> {
    try {
      return await this.withRetry(async () => {
        const { data, error } = await supabase.storage.from(this.bucket).list(`${this.workflowInvocationId}/${scope}`)

        if (error) throw new Error(`Failed to list files: ${error.message}`)

        return (data || []).map(file => file.name).filter(name => name && name !== ".emptyFolderPlaceholder")
      }, `Listing ${this.workflowInvocationId}/${scope}`)
    } catch (error) {
      lgg.warn(`Failed to list ${this.workflowInvocationId}/${scope}:`, error)
      return []
    }
  }

  async listWithInfo(scope: "workflow" | "node"): Promise<ContextFileInfo[]> {
    try {
      const keys = await this.list(scope)
      const infoPromises = keys.map(async key => {
        try {
          return await this.withRetry(async () => {
            const [summary, metadataData] = await Promise.all([
              this.getSummary(scope, key),
              supabase.storage.from(this.bucket).download(`${this.makePath(scope, key)}/metadata.json`),
            ])

            const metadata = metadataData.data ? JSON.parse(await metadataData.data.text()) : {}

            return {
              key,
              summary: summary || "No summary available",
              created: metadata.created || new Date().toISOString(),
              modified: metadata.modified || new Date().toISOString(),
              size: metadata.size || 0,
              dataType: metadata.dataType || "unknown",
            }
          }, `Loading info for ${key}`)
        } catch (error) {
          lgg.warn(`Failed to load info for ${key}:`, error)
          return {
            key,
            summary: "Error loading summary",
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            size: 0,
            dataType: "unknown",
          }
        }
      })

      return await Promise.all(infoPromises)
    } catch (error) {
      lgg.warn(`Failed to list with info for ${scope}:`, error)
      return []
    }
  }
}
