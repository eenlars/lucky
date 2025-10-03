import { lgg } from "@core/utils/logging/Logger"
import { createContextStore } from "@core/utils/persistence/memory/ContextStore"
import { isNir } from "@lucky/shared"
import { Tools } from "@lucky/shared"
import type { CodeToolResult } from "@lucky/tools"
import { defineTool } from "@lucky/tools"
import { z } from "zod"
import type { TodoItem, TodoReadResult } from "./types"

const TODO_STORE_KEY = "session_todos"
const longDescription =
  'Use this tool to read the current to-do list for the session. This tool should be used proactively and frequently to ensure that you are aware of\nthe status of the current task list. You should make use of this tool as often as possible, especially in the following situations:\n- At the beginning of conversations to see what\'s pending\n- Before starting new tasks to prioritize work\n- When the user asks about previous tasks or plans\n- Whenever you\'re uncertain about what to do next\n- After completing tasks to update your understanding of remaining work\n- After every few messages to ensure you\'re on track\n\nUsage:\n- This tool takes in no parameters. So leave the input blank or empty. DO NOT include a dummy object, placeholder string or a key like "input" or "empty". LEAVE IT BLANK.\n- Returns a list of todo items with their status, priority, and content\n- Use this information to track progress and plan next steps\n- If no todos exist yet, an empty list will be returned'
/**
 * TodoRead tool - reads the current session's todo list
 * Matches the exact interface of Claude Code's TodoRead tool
 */
const todoRead = defineTool({
  name: "todoRead",
  description: longDescription,
  params: z
    .object({})
    .describe(
      'No input is required, leave this field blank. NOTE that we do not require a dummy object, placeholder string or a key like "input" or "empty". LEAVE IT BLANK.',
    ),

  async execute(_params, externalContext): Promise<CodeToolResult<TodoReadResult>> {
    try {
      const workflowInvocationId = externalContext.workflowInvocationId

      lgg.info("todoRead: reading session todo list")

      // create context store for this workflow session
      const store = createContextStore("supabase", workflowInvocationId)

      // get todos from workflow scope (shared across all nodes in the workflow)
      const todoData = await store.get("workflow", TODO_STORE_KEY)

      // parse the stored todos or return empty array
      let todos: TodoItem[] = []
      if (todoData) {
        if (Array.isArray(todoData)) {
          todos = todoData
        } else {
          lgg.warn("todoRead: stored todo data is not an array, returning empty list")
        }
      }

      return Tools.createSuccess<TodoReadResult>("todoRead", {
        todos,
        isEmpty: isNir(todos),
      })
    } catch (error) {
      lgg.error("todoRead error:", error)
      return Tools.createFailure("todoRead", {
        location: "todoRead:error",
        error: error instanceof Error ? error.message : String(error),
      })
    }
  },
})

export default todoRead
