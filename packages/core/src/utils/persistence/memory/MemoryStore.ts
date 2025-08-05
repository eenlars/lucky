// todo-circulardep: MemoryStore imports from ContextStore which imports back from MemoryStore
import { generateSummaryFromUnknownData } from "@messages/summaries"
import type { ContextFileInfo } from "@tools/context/contextStore.types"
import type { ContextStore } from "./ContextStore"

interface MemoryStoreFile extends ContextFileInfo {
  // todo-typesafety: replace 'any' with proper type - violates CLAUDE.md "we hate any"
  data: any
}

export class InMemoryContextStore implements ContextStore {
  private data = new Map<string, MemoryStoreFile>()
  private metadata = new Map<
    string,
    { created: string; modified: string; size: number; dataType: string }
  >()

  constructor(private workflowInvocationId: string) {}

  private makeKey(scope: "workflow" | "node", key: string): string {
    return `${this.workflowInvocationId}:${scope}:${key}`
  }

  async get<T>(
    scope: "workflow" | "node",
    key: string
  ): Promise<T | undefined> {
    const file = this.data.get(this.makeKey(scope, key))
    // todo-typesafety: unsafe 'as' type assertion - violates CLAUDE.md "we hate as"
    return file?.data as T | undefined
  }

  async set<T>(
    scope: "workflow" | "node",
    key: string,
    value: T
  ): Promise<void> {
    const mapKey = this.makeKey(scope, key)
    const now = new Date().toISOString()
    const dataStr = JSON.stringify(value, null, 2)
    const dataType = Array.isArray(value) ? "array" : typeof value
    const size = new Blob([dataStr]).size
    // todo-errorhandling: missing try/catch could leave store in inconsistent state
    const summaryResult = await generateSummaryFromUnknownData(value)
    const summary = summaryResult.summary

    const file: MemoryStoreFile = {
      key,
      data: value,
      summary,
      created: this.data.get(mapKey)?.created || now,
      modified: now,
      size,
      dataType,
    }

    this.data.set(mapKey, file)
    this.metadata.set(mapKey, {
      created: file.created,
      modified: file.modified,
      size: file.size,
      dataType: file.dataType,
    })
  }

  async delete(scope: "workflow" | "node", key: string): Promise<void> {
    const mapKey = this.makeKey(scope, key)
    this.data.delete(mapKey)
    this.metadata.delete(mapKey)
  }

  async getSummary(
    scope: "workflow" | "node",
    key: string
  ): Promise<string | undefined> {
    const file = this.data.get(this.makeKey(scope, key))
    return file?.summary
  }

  async list(scope: "workflow" | "node"): Promise<string[]> {
    const prefix = `${this.workflowInvocationId}:${scope}:`
    return Array.from(this.data.keys())
      .filter((key) => key.startsWith(prefix))
      .map((key) => key.substring(prefix.length))
  }

  async listWithInfo(scope: "workflow" | "node"): Promise<ContextFileInfo[]> {
    const keys = await this.list(scope)
    return keys
      .map((key) => {
        const mapKey = this.makeKey(scope, key)
        const file = this.data.get(mapKey)
        if (!file) return null

        return {
          key: file.key,
          summary: file.summary,
          created: file.created,
          modified: file.modified,
          size: file.size,
          dataType: file.dataType,
        }
      })
      .filter((item): item is ContextFileInfo => item !== null)
  }
}
