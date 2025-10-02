import { lgg } from "@core/utils/logging/Logger"
import { createContextStore } from "@core/utils/persistence/memory/ContextStore"
import Tools, { type CodeToolResult } from "@lucky/tools"
import { defineTool } from "@lucky/tools"
import { z } from "zod"

type OutputType = {
  operation: "delete" | "copy" | "move" | "clear" | "exists" | "backup"
  metadata?: any
}

/**
 * Advanced context store management operations.
 * Handles deletion, copying, moving, and batch operations.
 */
const contextManage = defineTool({
  name: "contextManage",
  params: z.object({
    operation: z
      .enum(["delete", "copy", "move", "clear", "exists", "backup"])
      .describe("Management operation to perform"),

    scope: z.enum(["workflow", "node"]).describe("Data scope to operate on"),

    key: z.string().nullish().describe("Key name (required for delete, copy, move, exists operations)"),

    targetKey: z.string().nullish().describe("Target key name (required for copy, move operations)"),

    targetScope: z
      .enum(["workflow", "node"])
      .nullish()
      .describe("Target scope (optional for copy, move operations, defaults to same scope)"),
    force: z
      .boolean()
      .nullish()
      .default(false)
      .describe("Force operation even if target exists (for copy, move operations)"),

    pattern: z.string().nullish().describe("Pattern for batch operations (supports wildcards with *)"),
  }),

  async execute(params, toolExecutionContext): Promise<CodeToolResult<OutputType>> {
    if (!toolExecutionContext?.workflowInvocationId) {
      throw new Error("workflowInvocationId is required")
    }

    const { operation, scope, key, targetKey, targetScope, force, pattern } = params

    lgg.info(`contextManage: ${operation} operation`, {
      scope,
      key,
      targetKey,
      workflowInvocationId: toolExecutionContext?.workflowInvocationId,
    })

    try {
      const store = createContextStore("supabase", toolExecutionContext?.workflowInvocationId)

      switch (operation) {
        case "delete": {
          if (!key) {
            return Tools.createFailure("contextManage", {
              location: "contextManage:delete:noKey",
              error: "delete operation requires a key",
            })
          }

          const value = await store.get(scope, key)
          if (value === undefined) {
            return Tools.createFailure("contextManage", {
              location: "contextManage:delete:keyNotFound",
              error: `Key '${key}' not found in ${scope} scope`,
            })
          }

          // Delete by setting to null (limitation of current ContextStore interface)
          await store.set(scope, key, null)

          return Tools.createSuccess<OutputType>("contextManage", {
            operation: "delete",
            metadata: {
              exists: true,
            },
          })
        }

        case "exists": {
          if (!key) {
            return Tools.createFailure("contextManage", {
              location: "contextManage:exists:noKey",
              error: "exists operation requires a key",
            })
          }

          const value = await store.get(scope, key)
          const exists = value !== undefined

          return Tools.createSuccess<OutputType>("contextManage", {
            operation: "exists",
            metadata: {
              exists,
            },
          })
        }

        case "copy": {
          if (!key || !targetKey) {
            return Tools.createFailure("contextManage", {
              location: "contextManage:copy:noKey",
              error: "copy operation requires both key and targetKey",
            })
          }

          const sourceValue = await store.get(scope, key)
          if (sourceValue === undefined) {
            return Tools.createFailure("contextManage", {
              location: "contextManage:copy:sourceKeyNotFound",
              error: `Source key '${key}' not found in ${scope} scope`,
            })
          }

          const destScope = targetScope || scope
          const targetValue = await store.get(destScope, targetKey)

          if (targetValue !== undefined && !force) {
            return Tools.createFailure("contextManage", {
              location: "contextManage:copy:targetKeyExists",
              error: `Target key '${targetKey}' already exists in ${destScope} scope. Use force: true to overwrite.`,
            })
          }

          await store.set(destScope, targetKey, sourceValue)

          return Tools.createSuccess<OutputType>("contextManage", {
            operation: "copy",
            metadata: {
              exists: true,
            },
          })
        }

        case "move": {
          if (!key || !targetKey) {
            return Tools.createFailure("contextManage", {
              location: "contextManage:move:noKey",
              error: "move operation requires both key and targetKey",
            })
          }

          const sourceValue = await store.get(scope, key)
          if (sourceValue === undefined) {
            return Tools.createFailure("contextManage", {
              location: "contextManage:move:sourceKeyNotFound",
              error: `Source key '${key}' not found in ${scope} scope`,
            })
          }

          const destScope = targetScope || scope
          const targetValue = await store.get(destScope, targetKey)

          if (targetValue !== undefined && !force) {
            return Tools.createFailure("contextManage", {
              location: "contextManage:move:targetKeyExists",
              error: `Target key '${targetKey}' already exists in ${destScope} scope. Use force: true to overwrite.`,
            })
          }

          // Set target first, then delete source
          await store.set(destScope, targetKey, sourceValue)
          await store.set(scope, key, null) // Delete source

          return Tools.createSuccess<OutputType>("contextManage", {
            operation: "move",
            metadata: {
              operation,
              scope,
              key,
              targetKey,
              targetScope: destScope,
            },
          })
        }

        case "clear": {
          const keys = await store.list(scope)
          let deletedCount = 0

          if (pattern) {
            const regexPattern = pattern.replace(/\*/g, ".*")
            const regex = new RegExp(regexPattern, "i")
            const matchingKeys = keys.filter((k: string) => regex.test(k))

            for (const k of matchingKeys) {
              await store.set(scope, k, null)
              deletedCount++
            }
          } else {
            for (const k of keys) {
              await store.set(scope, k, null)
              deletedCount++
            }
          }

          return Tools.createSuccess<OutputType>("contextManage", {
            operation: "clear",
            metadata: {
              deletedCount,
              pattern: pattern || "all",
              scope,
            },
          })
        }

        case "backup": {
          const keys = await store.list(scope)
          const backup: Record<string, any> = {}

          for (const k of keys) {
            const value = await store.get(scope, k)
            if (value !== undefined) {
              backup[k] = value
            }
          }

          const backupKey = `backup_${scope}_${new Date().toISOString().replace(/[:.]/g, "-")}`
          await store.set("workflow", backupKey, {
            scope,
            timestamp: new Date().toISOString(),
            keyCount: Object.keys(backup).length,
            data: backup,
          })

          return Tools.createSuccess<OutputType>("contextManage", {
            operation: "backup",
            metadata: {
              backupKey,
              keyCount: Object.keys(backup).length,
              scope,
            },
          })
        }

        default: {
          const _exhaustiveCheck: never = operation
          void _exhaustiveCheck
          return Tools.createFailure("contextManage", {
            location: "contextManage:unknownOperation",
            error: `Unknown operation: ${operation}`,
          })
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
      lgg.error("contextManage error:", errorMessage)
      return Tools.createFailure("contextManage", {
        location: "contextManage:error",
        error: errorMessage,
      })
    }
  },
})

export default contextManage
