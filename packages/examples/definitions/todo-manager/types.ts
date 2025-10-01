/**
 * TypeScript types for TodoManager tool
 * Implements the exact same interface as Claude Code's TodoWrite/TodoRead tools
 */

export type TodoStatus = "pending" | "in_progress" | "completed"
export type TodoPriority = "high" | "medium" | "low"

export interface TodoItem {
  readonly id: string
  readonly content: string
  readonly status: TodoStatus
  readonly priority: TodoPriority
}

export interface TodoList {
  readonly todos: TodoItem[]
}

export interface TodoWriteParams {
  todos: TodoItem[]
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TodoReadParams {
  // no parameters needed for read
}

export interface TodoWriteResult {
  success: boolean
  message: string
  todos: TodoItem[]
}

export interface TodoReadResult {
  todos: TodoItem[]
  isEmpty: boolean
}

export interface TodoStore {
  read(): Promise<TodoList>
  write(todos: TodoItem[]): Promise<void>
  clear(): Promise<void>
}

export const todoManagerPrompt = `# Task Management
You have access to the TodoWrite and TodoRead tools to help you manage and plan tasks. Use these tools VERY frequently to ensure that you are tracking your tasks and giving visibility into your progress.
These tools are also EXTREMELY helpful for planning tasks, and for breaking down larger complex tasks into smaller steps. If you do not use this tool when planning, you may forget to do important tasks - and that is unacceptable.

It is critical that you mark todos as completed as soon as you are done with a task. Do not batch up multiple tasks before marking them as completed.

Examples:

<example>
workflow_goal: Build a customer data analytics dashboard for an e-commerce platform
current_task: Set up the database schema and data pipeline

response: I need to set up the foundation for our analytics dashboard. Let me use TodoWrite to track the database and pipeline setup tasks:

Adding the following todos to support our dashboard goal:
- Design customer data schema with required fields
- Set up PostgreSQL database with proper indexes
- Create ETL pipeline to process customer transaction data
- Implement data validation and cleaning rules
- Set up automated data refresh scheduling
- Test data pipeline with sample customer records

I'm marking the first task as in_progress to begin designing the schema...

I've completed the schema design with customer_id, transaction_history, and behavioral_data tables. Marking this todo as completed and moving to database setup...

Now setting up the PostgreSQL instance with optimized indexes for our dashboard queries...
</example>

<example>
workflow_goal: Launch a mobile app for food delivery service
current_task: Implement user authentication and profile management

response: Working on the authentication system for our food delivery app. Let me break this down into specific todos that align with our app launch goal:

Using TodoWrite to add authentication-related tasks:
- Design user registration flow with email/phone verification
- Implement secure login with JWT token management
- Create user profile management interface
- Add password reset functionality
- Set up social media login integration (Google, Apple)
- Implement user data privacy controls and GDPR compliance
- Test authentication across iOS and Android platforms

Starting with user registration flow and marking it as in_progress...

I've implemented the registration flow with email verification. The user can now create accounts successfully. Marking this todo as completed and moving to secure login implementation...

Now implementing JWT-based authentication to ensure secure session management...

[Agent continues through each authentication task, systematically building toward the larger app launch goal]
</example>
`
