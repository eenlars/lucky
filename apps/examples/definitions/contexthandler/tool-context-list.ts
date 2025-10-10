import { lgg } from "@core/utils/logging/Logger"
import { createContextStore } from "@core/utils/persistence/memory/ContextStore"
import { JSONN } from "@lucky/shared"
import { Tools } from "@lucky/shared"
import type { CodeToolResult } from "@lucky/tools"
import { defineTool } from "@lucky/tools"
import { z } from "zod"

type KeyMetadata = {
  key: string
  valueType: string
  isComplex: boolean
  preview: string
  size: number
}

type OutputType = {
  operation: "list"
  scope: "workflow" | "node" | "both"
  totalFound: number
  filteredCount: number
  returnedCount: number
  metadata: {
    scope: "workflow" | "node" | "both"
    totalFound: number
    filteredCount: number
    returnedCount: number
    filter: string | null
    includeMetadata: boolean
    keys: {
      workflow: KeyMetadata[]
      node: KeyMetadata[]
    }
  }
  summary: {
    workflowKeys: number
    nodeKeys: number
    hasMore: boolean
    limit: number
  }
}

/**
 * List and explore data in the persistent context store.
 * Provides advanced filtering, searching, and metadata inspection.
 */
const contextList = defineTool({
  name: "contextList",
  description:
    "List keys in the persistent context store by scope (workflow/node). Returns array of key names only, not values. LIMITS: no filtering/searching, only returns keys not values, requires workflowInvocationId.",
  params: z.object({
    scope: z
      .enum(["workflow", "node", "both"])
      .nullish()
      .default("both")
      .describe("Data scope to list: 'workflow', 'node', or 'both' (default: both)"),

    filter: z.string().nullish().describe("Optional filter pattern to match key names (supports wildcards with *)"),

    includeMetadata: z
      .boolean()
      .nullish()
      .default(false)
      .describe("Whether to include metadata and value previews for each key"),

    limit: z.number().nullish().default(50).describe("Maximum number of keys to return (default: 50)"),
  }),

  async execute(params, externalContext): Promise<CodeToolResult<OutputType>> {
    const { scope, filter, includeMetadata, limit } = params
    const workflowInvocationId = externalContext.workflowInvocationId

    lgg.info(`contextList: listing ${scope} keys`, {
      workflowInvocationId,
      filter,
      includeMetadata,
    })

    try {
      const store = createContextStore("supabase", workflowInvocationId)

      // get keys from requested scopes
      const scopesToCheck =
        scope === "both" ? (["workflow", "node"] as const) : ([scope as "workflow" | "node"] as const)
      const allKeys: Array<{ scope: "workflow" | "node"; key: string }> = []

      for (const currentScope of scopesToCheck) {
        const keys = await store.list(currentScope)
        keys.forEach(key => allKeys.push({ scope: currentScope, key }))
      }

      // apply filter if provided
      let filteredKeys = allKeys
      if (filter) {
        const regexPattern = filter.replace(/\*/g, ".*")
        const regex = new RegExp(regexPattern, "i")
        filteredKeys = allKeys.filter(({ key }) => regex.test(key))
      }

      // apply limit
      const limitedKeys = filteredKeys.slice(0, limit ?? undefined)

      // process keys to get metadata
      const processedKeys: Array<{ scope: "workflow" | "node"; key: string } & KeyMetadata> = await Promise.all(
        limitedKeys.map(async ({ scope: keyScope, key }) => {
          if (!includeMetadata) {
            // return minimal data when metadata not requested
            return {
              scope: keyScope,
              key,
              valueType: "unknown",
              isComplex: false,
              preview: "",
              size: 0,
            }
          }

          try {
            const value = await store.get(keyScope, key)
            const valueType = typeof value
            const isComplex = typeof value === "object" && value !== null
            const preview = isComplex
              ? Array.isArray(value)
                ? `Array(${value.length})`
                : `Object(${Object.keys(value).length} keys)`
              : String(value).slice(0, 50) + (String(value).length > 50 ? "..." : "")

            return {
              scope: keyScope,
              key,
              valueType,
              isComplex,
              preview,
              size: JSON.stringify(value).length,
            }
          } catch (_error) {
            return {
              scope: keyScope,
              key,
              valueType: "unknown",
              isComplex: false,
              preview: "Failed to retrieve metadata",
              size: 0,
            }
          }
        }),
      )

      // group by scope for better organization
      const groupedResults = {
        workflow: processedKeys.filter(r => r.scope === "workflow"),
        node: processedKeys.filter(r => r.scope === "node"),
      }

      return Tools.createSuccess<OutputType>("contextList", {
        operation: "list",
        scope: scope ?? "both",
        totalFound: allKeys.length,
        filteredCount: filteredKeys.length,
        returnedCount: limitedKeys.length,
        metadata: {
          scope: scope ?? "both",
          totalFound: allKeys.length,
          filteredCount: filteredKeys.length,
          returnedCount: limitedKeys.length,
          filter: filter || null,
          includeMetadata: includeMetadata ?? false,
          keys: {
            workflow: groupedResults.workflow.map(r => ({
              key: r.key,
              valueType: r.valueType,
              isComplex: r.isComplex,
              preview: r.preview,
              size: r.size,
            })),
            node: groupedResults.node.map(r => ({
              key: r.key,
              valueType: r.valueType,
              isComplex: r.isComplex,
              preview: r.preview,
              size: r.size,
            })),
          },
        },
        summary: {
          workflowKeys: groupedResults.workflow.length,
          nodeKeys: groupedResults.node.length,
          hasMore: filteredKeys.length > (limit ?? filteredKeys.length),
          limit: limit ?? filteredKeys.length,
        },
      })
    } catch (error) {
      lgg.error("contextList error:", error)
      return Tools.createFailure("contextList", {
        location: "contextList:error",
        error: JSONN.show(error),
      })
    }
  },
})

export default contextList
