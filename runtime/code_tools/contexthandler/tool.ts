import Tools, { type CodeToolResult } from "@core/tools/code/output.types"
import { defineTool } from "@core/tools/toolFactory"
import { lgg } from "@core/utils/logging/Logger"
import { createContextStore } from "@core/utils/persistence/memory/ContextStore"
import { z } from "zod"

type OutputType = {
  operation: "get" | "set" | "list" | "delete"
  scope: "workflow" | "node"
  key?: string
  value?: any
  found?: boolean
  keys?: string[]
}

/**
 * Simple context store tool for persistent data across workflow executions.
 * Uses the simplified ContextStore interface with workflow and node scopes.
 */
const contextHandler = defineTool({
  name: "contextHandler",
  params: z.object({
    operation: z.enum(["get", "set", "list", "delete"]).describe("Operation to perform: get, set, list, or delete"),

    scope: z
      .enum(["workflow", "node"])
      .describe("Scope for the data: 'workflow' for shared data, 'node' for node-specific data"),

    key: z.string().nullish().describe("Key name for the data (required for get, set, delete)"),

    value: z.any().nullish().describe("Value to store (required for set operation)"),
  }),

  async execute(params, externalContext): Promise<CodeToolResult<OutputType>> {
    try {
      const { operation, scope, key, value } = params

      const workflowInvocationId = externalContext.workflowInvocationId

      lgg.info(`contextHandler: executing ${operation}`, {
        scope,
        key,
        workflowInvocationId,
      })

      // Create context store for this workflow
      const store = createContextStore("supabase", workflowInvocationId)

      switch (operation) {
        case "get": {
          if (!key) {
            return Tools.createFailure("contextHandler", {
              location: "contextHandler:get:noKey",
              error: "get operation requires a key",
            })
          }

          const result = await store.get(scope, key)
          return Tools.createSuccess<OutputType>("contextHandler", {
            operation,
            scope,
            key,
            value: result ?? null,
            found: result !== undefined,
          })
        }

        case "set": {
          if (!key) {
            return Tools.createFailure("contextHandler", {
              location: "contextHandler:set:noKey",
              error: "set operation requires a key",
            })
          }
          if (value === undefined) {
            return Tools.createFailure("contextHandler", {
              location: "contextHandler:set:noValue",
              error: "set operation requires a value",
            })
          }

          await store.set(scope, key, value)
          return Tools.createSuccess<OutputType>("contextHandler", {
            operation,
            scope,
            key,
            value,
            found: true,
          })
        }

        case "list": {
          const keys = await store.list(scope)
          return Tools.createSuccess<OutputType>("contextHandler", {
            operation,
            scope,
            keys,
          })
        }

        case "delete": {
          if (!key) {
            return Tools.createFailure("contextHandler", {
              location: "contextHandler:delete:noKey",
              error: "delete operation requires a key",
            })
          }

          // Get current value to check if it exists
          const currentValue = await store.get(scope, key)
          if (currentValue === undefined) {
            return Tools.createFailure("contextHandler", {
              location: "contextHandler:delete:keyNotFound",
              error: `Key '${key}' not found in ${scope} scope`,
            })
          }

          // Delete by setting to undefined (this is a limitation of our simple interface)
          // In a real implementation, we'd add a delete method to ContextStore
          await store.set(scope, key, null)
          return Tools.createSuccess<OutputType>("contextHandler", {
            operation,
            scope,
            key,
            value: null,
            found: false,
          })
        }

        default: {
          const _exhaustiveCheck: never = operation
          void _exhaustiveCheck
          return Tools.createFailure("contextHandler", {
            location: "contextHandler:unknownOperation",
            error: `Unknown operation: ${operation}`,
          })
        }
      }
    } catch (error) {
      lgg.error("contextHandler error:", error)
      return Tools.createFailure("contextHandler", {
        location: "contextHandler:error",
        error: error instanceof Error ? error.message : String(error),
      })
    }
  },
})

export default contextHandler
