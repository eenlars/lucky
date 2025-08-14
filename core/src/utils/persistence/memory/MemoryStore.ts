// todo-circulardep: MemoryStore imports from ContextStore which imports back from MemoryStore
import { generateSummaryFromUnknownData } from "@core/messages/summaries"
import type { ContextFileInfo } from "@core/tools/context/contextStore.types"
import type { ContextStore } from "./ContextStore"

interface MemoryStoreFile extends ContextFileInfo {
  // todo-typesafety: replace 'any' with proper type - violates CLAUDE.md "we hate any"
  data: any
}

/**
 * In-memory implementation of context storage for workflow execution.
 * 
 * ## Runtime Architecture
 * 
 * Provides ephemeral storage during workflow execution with:
 * - Hierarchical key scoping (workflow vs node level)
 * - Automatic summary generation for stored data
 * - Metadata tracking (creation time, size, type)
 * 
 * ## Key Structure
 * 
 * Keys follow pattern: `{workflowInvocationId}:{scope}:{key}`
 * - Workflow scope: Shared across all nodes
 * - Node scope: Isolated to specific node instances
 * 
 * ## Performance Characteristics
 * 
 * - O(1) get/set operations via Map
 * - O(n) list operations with prefix filtering
 * - No persistence between invocations
 * - Memory limited by Node.js heap size
 * 
 * ## Summary Generation
 * 
 * All stored data gets LLM-generated summaries for:
 * - Quick context understanding without full data retrieval
 * - Efficient memory usage in agent prompts
 * - Better decision making about what data to access
 * 
 * @remarks
 * This is the default store for development and testing.
 * Production may use persistent stores like file or database.
 */
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

  /**
   * Retrieves data from the store by scope and key.
   * Runtime complexity: O(1) via Map lookup.
   */
  async get<T>(
    scope: "workflow" | "node",
    key: string
  ): Promise<T | undefined> {
    const file = this.data.get(this.makeKey(scope, key))
    // todo-typesafety: unsafe 'as' type assertion - violates CLAUDE.md "we hate as"
    return file?.data as T | undefined
  }

  /**
   * Stores data with automatic summary generation and metadata tracking.
   * 
   * Runtime operations:
   * 1. Generates key based on scope and workflow invocation
   * 2. Calculates data size and type for metadata
   * 3. Invokes LLM to generate data summary
   * 4. Preserves creation time on updates
   * 5. Updates both data and metadata maps atomically
   * 
   * @throws May throw if summary generation fails
   */
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
