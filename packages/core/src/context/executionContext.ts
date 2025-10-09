import { AsyncLocalStorage } from "node:async_hooks"

export type Principal = {
  clerk_id: string
  scopes: string[]
  auth_method: "api_key" | "session"
}

export type SecretResolver = {
  get(name: string, namespace?: string): Promise<string | undefined>
  getAll(names: string[], namespace?: string): Promise<Record<string, string>>
}

export type ExecutionContext = {
  principal: Principal
  secrets: SecretResolver
  apiKeys?: Record<string, string> // Pre-fetched API keys for multi-provider workflows
}

const executionContextStore = new AsyncLocalStorage<ExecutionContext>()

export function withExecutionContext<T>(ctx: ExecutionContext, fn: () => Promise<T>): Promise<T> {
  return executionContextStore.run(ctx, fn)
}

export function getExecutionContext(): ExecutionContext | undefined {
  return executionContextStore.getStore()
}

export function requireExecutionContext(): ExecutionContext {
  const ctx = getExecutionContext()
  if (!ctx) {
    throw new Error("No execution context. Workflow must be invoked via API endpoint.")
  }
  return ctx
}

export async function getApiKey(name: string): Promise<string | undefined> {
  const ctx = getExecutionContext()

  // No context means server-level execution (use process.env)
  if (!ctx) {
    return process.env[name]
  }

  // Check pre-fetched keys first (fast path for multi-provider workflows)
  if (ctx.apiKeys?.[name]) {
    return ctx.apiKeys[name]
  }

  // Fallback to on-demand fetch (lazy loading for single-provider workflows)
  return ctx.secrets.get(name)
}
