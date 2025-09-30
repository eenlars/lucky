import Tools, { type CodeToolResult } from "@core/tools/code/output.types"
import { defineTool } from "@core/tools/toolFactory"
import { isNir } from "@core/utils/common/isNir"
import { lgg } from "@core/utils/logging/Logger"
import { createContextStore } from "@core/utils/persistence/memory/ContextStore"
import { z } from "zod"
import type { TodoWriteResult } from "./types"

const TODO_STORE_KEY = "session_todos"
const longDescription =
  "Use this tool to create and manage a structured task list for your current session. This helps you track progress, organize complex tasks, and demonstrate thoroughness to the user.\nIt also helps the user understand the progress of the task and overall progress of their requests.\n\n## When to Use This Tool\nUse this tool proactively in these scenarios:\n\n1. Complex multi-step tasks - When a task requires 3 or more distinct steps or actions\n2. Non-trivial and complex tasks - Tasks that require careful planning or multiple operations\n3. User explicitly requests todo list - When the user directly asks you to use the todo list\n4. User provides multiple tasks - When users provide a list of things to be done (numbered or comma-separated)\n5. After receiving new instructions - Immediately capture user requirements as todos. Feel free to edit the todo list based on new information.\n6. After completing a task - Mark it complete and add any new follow-up tasks\n7. When you start working on a new task, mark the todo as in_progress. Ideally you should only have one todo as in_progress at a time. Complete existing tasks before starting new ones.\n\n## When NOT to Use This Tool\n\nSkip using this tool when:\n1. There is only a single, straightforward task\n2. The task is trivial and tracking it provides no organizational benefit\n3. The task can be completed in less than 3 trivial steps\n4. The task is purely conversational or informational\n\nNOTE that you should use should not use this tool if there is only one trivial task to do. In this case you are better off just doing the task directly.\n\n## Examples of When to Use the Todo List\n\n<example>\nUser: I need you to research the market for electric vehicles, analyze pricing trends, and prepare a summary report with recommendations.\nAssistant: I'll help you research the electric vehicle market and prepare a comprehensive analysis. Let me create a todo list to track this research project.\n*Creates todo list with the following items:*\n1. Research current EV market landscape and key players\n2. Analyze pricing trends across different EV segments\n3. Gather data on consumer preferences and adoption rates\n4. Review industry forecasts and growth projections\n5. Compile findings into summary report with recommendations\n*Begins working on the first task*\n\n<reasoning>\nThe assistant used the todo list because:\n1. Market research and analysis is a multi-step process requiring data gathering, analysis, and synthesis\n2. The user requested multiple deliverables (research, analysis, and report)\n3. The task involves complex information processing that benefits from systematic tracking\n</reasoning>\n</example>\n\n<example>\nUser: Help me plan a comprehensive marketing campaign for our new product launch including social media, email marketing, content creation, and influencer outreach\nAssistant: I'll help you plan a comprehensive marketing campaign for your product launch. This involves multiple channels and coordination, so let me create a todo list to organize our approach.\n*Creates todo list with specific items for each marketing channel and timeline considerations*\n\n<reasoning>\nThe assistant used the todo list because:\n1. The user specified multiple marketing channels requiring different strategies\n2. Product launch campaigns involve complex coordination and timing\n3. Each channel requires distinct planning and execution steps\n4. The todo list helps ensure no marketing avenue is overlooked\n</reasoning>\n</example>\n\n<example>\nUser: I need to implement these features for my business: customer database, inventory management, sales tracking, and reporting dashboard.\nAssistant: I'll help you implement these business features. First, let's add all the features to the todo list.\n*Creates a todo list breaking down each feature into specific implementation tasks*\nAssistant: Let's start with the customer database. This will involve defining data requirements, choosing appropriate tools, and setting up the initial structure.\n\n<reasoning>\nThe assistant used the todo list because:\n1. The user provided multiple complex business features in a list\n2. The todo list helps organize these large features into manageable tasks\n3. This approach allows for tracking progress across the entire implementation\n</reasoning>\n</example>\n\n<example>\nUser: Can you help optimize my workflow? I'm spending too much time on repetitive tasks and need better organization.</user>\nAssistant: I'll help optimize your workflow and reduce time spent on repetitive tasks. First, let me understand your current processes and identify optimization opportunities.\n*Analyzes current workflow patterns, identifies bottlenecks, and areas for improvement*\nAssistant: After reviewing your workflow, I've identified several optimization opportunities. Let me create a todo list to track our improvement efforts.\n*Creates todo list with items like: 1) Automate daily report generation, 2) Streamline approval processes, 3) Implement task templates for common requests, 4) Set up automated notifications, 5) Create workflow documentation and training materials*\nLet's start by automating your daily report generation process.</assistant>\n\n<reasoning>\nThe assistant used the todo list because:\n1. First, the assistant analyzed the current workflow to identify specific issues\n2. Based on this analysis, it identified multiple optimization opportunities\n3. Workflow optimization requires multiple systematic improvements\n4. The todo list helps methodically track improvements across different processes\n5. This systematic approach ensures all inefficiencies are addressed\n</reasoning>\n</example>\n\n## Examples of When NOT to Use the Todo List\n\n<example>\nUser: What's the best way to write a professional email?\nAssistant: Here are key elements of a professional email:\n\n1. Clear, specific subject line\n2. Proper greeting (Dear/Hello + name)\n3. Concise, well-organized body\n4. Professional closing (Best regards, Sincerely)\n5. Signature with contact information\n\nKeep it brief, use proper grammar, and maintain a respectful tone throughout.</assistant>\n\n<reasoning>\nThe assistant did not use the todo list because this is a single, informational request. The user is asking for guidance, not for the assistant to perform multiple tasks or steps.\n</reasoning>\n</example>\n\n<example>\nUser: Can you explain the difference between renewable and non-renewable energy?\nAssistant: The main differences between renewable and non-renewable energy are:\n\n**Renewable Energy:**\n- Sources that naturally replenish (solar, wind, hydro, geothermal)\n- Sustainable long-term use\n- Generally lower environmental impact\n\n**Non-renewable Energy:**\n- Finite sources that take millions of years to form (coal, oil, natural gas)\n- Will eventually be depleted\n- Higher environmental impact and emissions\n\nRenewable energy is increasingly important for sustainable development and reducing carbon emissions.\n\n<reasoning>\nThe assistant did not use the todo list because this is an educational request with no actual tasks to complete. The user is simply asking for an explanation of concepts.\n</reasoning>\n</example>\n\n<example>\nUser: Can you write a brief summary of today's meeting for me?\nAssistant: I'd be happy to help write a meeting summary. However, I don't have access to the details of your meeting. Could you please provide me with the key points, decisions made, and action items discussed during the meeting? Once you share those details, I can format them into a professional summary.\n\n<reasoning>\nThe assistant did not use the todo list because this is a single, straightforward task. Writing a summary is one focused activity that doesn't require tracking multiple steps or systematic organization.\n</reasoning>\n</example>\n\n<example>\nUser: Can you look up the current weather forecast for New York?\nAssistant: I'll check the current weather forecast for New York.\n\n*Uses weather lookup tool*\n\nHere's the current weather forecast for New York:\n[Weather information]\n\n<reasoning>\nThe assistant did not use the todo list because this is a single information retrieval task with immediate results. There are no multiple steps to track or organize, making the todo list unnecessary for this straightforward request.\n</reasoning>\n</example>\n\n## Task States and Management\n\n1. **Task States**: Use these states to track progress:\n   - pending: Task not yet started\n   - in_progress: Currently working on (limit to ONE task at a time)\n   - completed: Task finished successfully\n   - cancelled: Task no longer needed\n\n2. **Task Management**:\n   - Update task status in real-time as you work\n   - Mark tasks complete IMMEDIATELY after finishing (don't batch completions)\n   - Only have ONE task in_progress at any time\n   - Complete current tasks before starting new ones\n   - Cancel tasks that become irrelevant\n\n3. **Task Breakdown**:\n   - Create specific, actionable items\n   - Break complex tasks into smaller, manageable steps\n   - Use clear, descriptive task names\n\nWhen in doubt, use this tool. Being proactive with task management demonstrates attentiveness and ensures you complete all requirements successfully.\n"

// zod schema for todo item validation
const todoItemSchema = z.object({
  id: z.string().describe("Unique identifier for the todo item"),
  content: z.string().min(1).describe("The task description or content"),
  status: z.enum(["pending", "in_progress", "completed"]).describe("Current status of the task"),
  priority: z.enum(["high", "medium", "low"]).describe("Priority level of the task"),
})

/**
 * TodoWrite tool - manages the current session's todo list
 * Matches the exact interface of Claude Code's TodoWrite tool
 */
const todoWrite = defineTool({
  name: "todoWrite",
  description: longDescription,
  params: z.object({
    todos: z.array(todoItemSchema).min(0, "Todos array is required"),
  }),

  async execute(params, externalContext): Promise<CodeToolResult<TodoWriteResult>> {
    try {
      const workflowInvocationId = externalContext.workflowInvocationId
      const { todos } = params

      lgg.info("todoWrite: updating session todo list", {
        todoCount: todos.length,
        todos: todos.map(t => ({
          id: t.id,
          content: t.content,
          status: t.status,
        })),
      })

      // validation: only one task can be in_progress at a time
      const inProgressTodos = todos.filter(todo => todo.status === "in_progress")
      if (inProgressTodos.length > 1) {
        return Tools.createFailure("todoWrite", {
          location: "todoWrite:validation:multipleInProgress",
          error: `Only one task can be in_progress at a time. Found ${inProgressTodos.length} in_progress tasks.`,
        })
      }

      // validation: all IDs must be unique
      const ids = todos.map(t => t.id)
      const uniqueIds = new Set(ids)
      if (ids.length !== uniqueIds.size) {
        return Tools.createFailure("todoWrite", {
          location: "todoWrite:validation:duplicateIds",
          error: "All todo IDs must be unique",
        })
      }

      // create context store for this workflow session
      const store = createContextStore("supabase", workflowInvocationId)

      // store todos in workflow scope (shared across all nodes in the workflow)
      await store.set("workflow", TODO_STORE_KEY, todos)

      // create success message
      let message = "Todos have been modified successfully."
      if (isNir(todos)) {
        message = "Todo list has been cleared."
      } else {
        const pendingCount = todos?.filter(t => t.status === "pending").length
        const inProgressCount = todos?.filter(t => t.status === "in_progress").length
        const completedCount = todos?.filter(t => t.status === "completed").length

        message += ` ${
          todos?.length ?? 0
        } total todos (${pendingCount} pending, ${inProgressCount} in progress, ${completedCount} completed).`
      }

      return Tools.createSuccess<TodoWriteResult>("todoWrite", {
        success: true,
        message,
        todos,
      })
    } catch (error) {
      lgg.error("todoWrite error:", error)
      return Tools.createFailure("todoWrite", {
        location: "todoWrite:error",
        error: error instanceof Error ? error.message : String(error),
      })
    }
  },
})

export default todoWrite
