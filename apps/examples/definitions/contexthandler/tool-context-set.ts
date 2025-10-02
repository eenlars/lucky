import { lgg } from "@core/utils/logging/Logger"
import { createContextStore } from "@core/utils/persistence/memory/ContextStore"
import Tools, { type CodeToolResult } from "@lucky/tools"
import { defineTool } from "@lucky/tools"
import { z } from "zod"

/**
 * Store data in the persistent context store.
 * Supports complex data types, automatic serialization, and metadata tracking.
 */
const contextSet = defineTool({
  name: "contextSet",
  params: z.object({
    scope: z
      .enum(["workflow", "node"])
      .describe("Data scope: 'workflow' for shared data across all nodes, 'node' for node-specific data"),

    key: z.string().describe("The key name to store data under"),

    value: z.any().describe("The data to store (can be any JSON-serializable type)"),

    metadata: z
      .object({
        description: z.string().nullish(),
        tags: z.array(z.string()).nullish(),
        expires: z.string().nullish().describe("ISO date string for expiration"),
        version: z.string().nullish(),
      })
      .nullish()
      .describe("Optional metadata to store alongside the value"),

    overwrite: z.boolean().nullish().default(true).describe("Whether to overwrite existing data (default: true)"),
  }),
  async execute(
    params,
    externalContext,
  ): Promise<
    CodeToolResult<{
      operation: "set"
      scope: "workflow" | "node"
      key: string
      message: string
    }>
  > {
    const { scope, key, value, metadata, overwrite } = params

    const workflowInvocationId = externalContext.workflowInvocationId

    // Validate workflowInvocationId format
    if (!workflowInvocationId || typeof workflowInvocationId !== "string") {
      return Tools.createFailure("contextSet", {
        location: "contextSet",
        error: "workflowInvocationId must be a non-empty string",
      })
    }

    lgg.info(`contextSet: storing ${scope}:${key}`, {
      workflowInvocationId,
      workflowIdLength: workflowInvocationId.length,
      workflowIdSample: workflowInvocationId.substring(0, 8),
      valueType: typeof value,
      hasMetadata: !!metadata,
    })

    try {
      const store = createContextStore("supabase", workflowInvocationId)

      // Check if key exists if overwrite is false
      if (!overwrite) {
        const existing = await store.get(scope, key)
        if (existing !== undefined) {
          return Tools.createFailure("contextSet", {
            location: "contextSet",
            error: `Key '${key}' already exists in ${scope} scope. Use overwrite: true to replace it.`,
          })
        }
      }

      // Prepare the data to store
      const dataToStore = metadata
        ? {
            value,
            metadata: {
              ...metadata,
              storedAt: new Date().toISOString(),
              storedBy: "contextSet",
            },
          }
        : value

      await store.set(scope, key, dataToStore)

      // Get some stats about what was stored
      const valueSize = JSON.stringify(value).length
      const isComplex = typeof value === "object" && value !== null
      const dataType = Array.isArray(value) ? "array" : typeof value

      return Tools.createSuccess("contextSet", {
        success: true,
        operation: "set",
        scope,
        key,
        message: `Successfully stored data for key '${key}' in ${scope} scope`,
        stats: {
          dataType,
          isComplex,
          valueSize,
          hasMetadata: !!metadata,
          storedAt: new Date().toISOString(),
        },
      })
    } catch (error) {
      lgg.error("contextSet error:", error)

      // Check if this is a file limit error and provide helpful message
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes("maximum file limit")) {
        return Tools.createFailure("contextSet", {
          location: "contextSet",
          error: `${errorMessage} Consider updating existing context data instead of creating new entries.`,
        })
      }

      return Tools.createFailure("contextSet", {
        location: "contextSet",
        error: error,
      })
    }
  },
})

export default contextSet
