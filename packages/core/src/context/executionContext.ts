import { AsyncLocalStorage } from "node:async_hooks"
import { getProviderDisplayName } from "@core/workflow/provider-extraction"
import type { SpendingTracker } from "@lucky/core/utils/spending/SpendingTracker"
import type { Models } from "@lucky/models"
import { providerConfigSchema as modelsProviderConfigSchema } from "@lucky/models"
import { ZPrincipal } from "@lucky/shared"
import type { SecretResolver } from "@lucky/shared/contracts/ingestion"
import { z } from "zod"
import { RuntimeContext } from "./runtime-context"
/**
 * Runtime cache schema for workflow execution.
 * Stores computed values that should be reused throughout a single workflow invocation.
 */
export const ZExecutionSchema = z.object({
  principal: ZPrincipal,
  secrets: z.custom<SecretResolver>(),
  apiKeys: z.record(z.string()).optional(),
  // Provider configuration used by @lucky/models instance
  providerConfig: z.record(modelsProviderConfigSchema).optional(),
  modelsInstance: z.custom<Models>().optional(),
  spendingTracker: z.custom<SpendingTracker>().optional(),
})

export type ExecutionSchema = z.infer<typeof ZExecutionSchema>

const executionContextStore = new AsyncLocalStorage<RuntimeContext<ExecutionSchema>>()

export function withExecutionContext<T>(values: ExecutionSchema, fn: () => Promise<T>): Promise<T> {
  const parsed = ZExecutionSchema.safeParse(values)
  if (!parsed.success) {
    throw new Error(`Invalid execution context: ${parsed.error.message}`)
  }
  const ctx = new RuntimeContext<ExecutionSchema>(Object.entries(parsed.data) as any)
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
  const isProduction = process.env.NODE_ENV === "production"
  console.log(`[getApiKey] Looking for ${name}, ctx: ${Boolean(ctx)}, prod: ${isProduction}`)

  // Local/dev/test: Check execution context first, then fall back to process.env
  if (!isProduction) {
    // If execution context exists, prefer its apiKeys over process.env
    if (ctx) {
      const apiKeys = ctx.get("apiKeys") as Record<string, string> | undefined
      if (apiKeys?.[name]) return apiKeys[name]

      // Check secrets from context
      const secrets = ctx.get("secrets")
      const secretValue = await secrets.get(name, "environment-variables")
      if (secretValue) return secretValue

      // Session auth should NOT fall back to process.env for security
      const principal = ctx.get("principal")
      if (principal?.auth_method === "session") {
        return undefined
      }
    }

    // Fall back to process.env if no context value found (except for session auth)
    const envVal = process.env[name]
    if (envVal) return envVal

    return undefined
  }

  // Production: MUST resolve to external keys (execution context); never process.env
  if (!ctx) {
    console.error(`[getApiKey] ❌ No execution context in production for key ${name}`)
    return undefined
  }

  const apiKeys = ctx.get("apiKeys") as Record<string, string> | undefined
  if (apiKeys?.[name]) return apiKeys[name]

  const secrets = ctx.get("secrets")
  const secretValue = await secrets.get(name, "environment-variables")
  if (!secretValue) {
    const principal = ctx.get("principal")
    const providerName = getProviderDisplayName(name)
    console.error(
      `[getApiKey] ❌ ${providerName} API key not configured for user in production (auth_method: ${principal.auth_method})`,
    )
    return undefined
  }
  return secretValue
}

// Re-export SecretResolver type for tests and consumers importing from core
export type { SecretResolver } from "@lucky/shared/contracts/ingestion"
