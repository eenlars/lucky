import { AsyncLocalStorage } from "node:async_hooks"
import { getProviderDisplayName } from "@core/workflow/provider-extraction"
import type { Models, ProviderConfig } from "@lucky/models"
import { RuntimeContext } from "./runtime-context"

export type Principal = {
  clerk_id: string
  scopes: string[]
  auth_method: "api_key" | "session"
}

export type SecretResolver = {
  get(name: string, namespace?: string): Promise<string | undefined>
  getAll(names: string[], namespace?: string): Promise<Record<string, string>>
}

/**
 * Runtime cache schema for workflow execution.
 * Stores computed values that should be reused throughout a single workflow invocation.
 */
export type ExecutionSchema = {
  principal: Principal
  secrets: SecretResolver
  apiKeys?: Record<string, string>
  providerConfig?: Record<string, ProviderConfig>
  modelsInstance?: Models
  spendingTracker?: any // Will be typed as SpendingTracker to avoid circular import
}

const executionContextStore = new AsyncLocalStorage<RuntimeContext<ExecutionSchema>>()

export function withExecutionContext<T>(values: ExecutionSchema, fn: () => Promise<T>): Promise<T> {
  const ctx = new RuntimeContext<ExecutionSchema>(Object.entries(values) as any)
  return executionContextStore.run(ctx, fn)
}

export function getExecutionContext(): RuntimeContext<ExecutionSchema> | undefined {
  return executionContextStore.getStore()
}

export function requireExecutionContext(): RuntimeContext<ExecutionSchema> {
  const ctx = getExecutionContext()
  if (!ctx) {
    throw new Error("No execution context. Workflow must be invoked via API endpoint.")
  }
  return ctx
}

export async function getApiKey(name: string): Promise<string | undefined> {
  const ctx = getExecutionContext()
  console.log(`[getApiKey] Looking for ${name}, context exists:`, !!ctx)

  // No context means server-level execution (use process.env)
  if (!ctx) {
    console.log(`[getApiKey] No context, using process.env.${name}`)
    return process.env[name]
  }

  // Check pre-fetched keys first (fast path for multi-provider workflows)
  const apiKeys = ctx.get("apiKeys") as Record<string, string> | undefined
  if (apiKeys?.[name]) {
    console.log(`[getApiKey] Found ${name} in pre-fetched keys`)
    return apiKeys[name]
  }

  console.log(`[getApiKey] ${name} not in pre-fetched keys, fetching from secrets`)
  // Fallback to on-demand fetch (lazy loading for single-provider workflows)
  const secrets = ctx.get("secrets")
  const secretValue = await secrets.get(name, "environment-variables")

  // If user doesn't have this key in their secrets
  if (!secretValue) {
    const principal = ctx.get("principal")
    console.log(`[getApiKey] Secret not found. Auth method: ${principal.auth_method}`)

    // Session auth (UI users) REQUIRE their own configured keys - no fallback
    if (principal.auth_method === "session") {
      const providerName = getProviderDisplayName(name)
      console.error(
        `[getApiKey] ❌ ${providerName} API key not configured for user (session auth - no fallback allowed)`,
      )
      console.error(`   User must add ${providerName} in Settings → Providers`)
      return undefined
    }

    // API key auth (programmatic access) can fall back to server-level keys
    console.log(
      `[getApiKey] ${name} not in user secrets, falling back to process.env (auth_method: ${principal.auth_method})`,
    )
    return process.env[name]
  }

  return secretValue
}
