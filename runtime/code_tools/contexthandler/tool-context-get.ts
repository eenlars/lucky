import { defineTool } from "@core/tools/toolFactory"
import { lgg } from "@core/utils/logging/Logger"
import { createContextStore } from "@core/utils/persistence/memory/ContextStore"
import { z } from "zod"

/**
 * Retrieve data from the persistent context store.
 * Optimized for quick data retrieval with intelligent caching.
 */
const contextGet = defineTool({
  name: "contextGet",
  params: z.object({
    scope: z
      .enum(["workflow", "node"])
      .describe("Data scope: 'workflow' for shared data across all nodes, 'node' for node-specific data"),

    key: z.string().describe("The key name to retrieve data for"),

    workflowInvocationId: z.string().describe("Workflow invocation ID for the context store"),

    defaultValue: z.any().nullish().describe("Optional default value to return if key is not found"),
  }),

  async execute(params) {
    const { scope, key, workflowInvocationId, defaultValue } = params

    lgg.info(`contextGet: retrieving ${scope}:${key}`, { workflowInvocationId })

    try {
      const store = createContextStore("supabase", workflowInvocationId)
      const value = await store.get(scope, key)

      const found = value !== undefined
      const returnValue = found ? value : defaultValue

      return {
        success: true,
        operation: "get",
        scope,
        key,
        value: returnValue,
        found,
        cached: false, // TODO: Could detect if from cache
        message: found
          ? `Successfully retrieved data for key '${key}' from ${scope} scope`
          : defaultValue !== undefined
            ? `Key '${key}' not found in ${scope} scope, returning default value`
            : `Key '${key}' not found in ${scope} scope`,
      }
    } catch (error) {
      lgg.error("contextGet error:", error)

      // If there's an error and we have a default value, return it
      if (defaultValue !== undefined) {
        return {
          success: true,
          operation: "get",
          scope,
          key,
          value: defaultValue,
          found: false,
          cached: false,
          message: `Error retrieving key '${key}', returning default value`,
          warning: error instanceof Error ? error.message : String(error),
        }
      }

      return {
        success: false,
        operation: "get",
        scope,
        key,
        error: error instanceof Error ? error.message : String(error),
        message: `Failed to retrieve data for key '${key}' from ${scope} scope`,
      }
    }
  },
})

export default contextGet
