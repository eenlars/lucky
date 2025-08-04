import Tools, { type CodeToolResult } from "@/core/tools/code/output.types"
import { defineTool } from "@/core/tools/toolFactory"
import {
  addMemory,
  deleteMemory,
  getAllMemories,
  getMemories,
  updateMemory,
} from "@/core/utils/clients/mem0/client"
import { z } from "zod"

const MemoryActionSchema = z
  .object({
    action: z
      .enum(["add", "get", "getAll", "update", "delete"])
      .describe("Action to perform"),
    message: z
      .string()
      .nullish()
      .describe("Message content for add/update actions"),
    query: z.string().nullish().describe("Search query for get action"),
    limit: z.number().nullish().default(4).describe("Limit for get action"),
    memoryId: z
      .string()
      .nullish()
      .describe("Memory ID for update/delete actions"),
  })
  .describe("Parameters for memory operations")

export const tool = defineTool({
  name: "memoryManager",
  params: MemoryActionSchema,
  execute: async (params, externalContext): Promise<CodeToolResult<any>> => {
    const { action, message, query, limit, memoryId } = params
    const { workflowId } = externalContext
    switch (action) {
      case "add":
        if (!message) throw new Error("Message is required for add action")
        return Tools.createSuccess(
          "memoryManager",
          await addMemory(message, workflowId)
        )
      case "get":
        if (!query) throw new Error("Query is required for get action")
        return Tools.createSuccess(
          "memoryManager",
          await getMemories(query, workflowId, limit ?? undefined)
        )
      case "getAll":
        return Tools.createSuccess(
          "memoryManager",
          await getAllMemories(workflowId)
        )
      case "update":
        if (!memoryId || !message)
          throw new Error("MemoryId and message are required for update action")
        return await updateMemory(memoryId, message)
      case "delete":
        if (!memoryId) throw new Error("MemoryId is required for delete action")
        await deleteMemory(memoryId)
        return Tools.createSuccess("memoryManager", "delete")
      default:
        throw new Error(`Unsupported action: ${action}`)
    }
  },
})
