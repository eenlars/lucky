import { AsyncLocalStorage } from "node:async_hooks"
import { getProviderDisplayName } from "@core/workflow/provider-extraction"
import type { SpendingTracker } from "@lucky/core/utils/spending/SpendingTracker"
import type { Models } from "@lucky/models/server"
import { providerConfigSchema as modelsProviderConfigSchema } from "@lucky/models"
import { ZPrincipal, executionMCPContextSchema } from "@lucky/shared"
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
  // MCP toolkits available during this invocation (UI-configured or file-based)
  mcp: executionMCPContextSchema.optional(),
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
  const providerName = getProviderDisplayName(name)

  console.log(`[getApiKey] 🔍 Resolving ${name} (${providerName})`)
  console.log(`           Environment: ${isProduction ? "production" : "development"}`)
  console.log(`           Context available: ${Boolean(ctx)}`)

  // Local/dev/test: Check execution context first, then fall back to process.env
  if (!isProduction) {
    // If execution context exists, prefer its apiKeys over process.env
    if (ctx) {
      const principal = ctx.get("principal")
      console.log(`           Auth method: ${principal?.auth_method}`)

      const apiKeys = ctx.get("apiKeys") as Record<string, string> | undefined
      if (apiKeys?.[name]) {
        console.log("           ✅ Found in execution context apiKeys")
        return apiKeys[name]
      }

      // Check secrets from context
      const secrets = ctx.get("secrets")
      const secretValue = await secrets.get(name, "environment-variables")
      if (secretValue) {
        console.log("           ✅ Found in execution context secrets")
        return secretValue
      }

      // Session auth should NOT fall back to process.env for security
      if (principal?.auth_method === "session") {
        console.error("           ❌ Not found in context and session auth blocks process.env fallback")
        console.error("           💡 For dev/testing, ensure API keys are passed in execution context")
        return undefined
      }
    }

    // Fall back to process.env if no context value found (except for session auth)
    const envVal = process.env[name]
    if (envVal) {
      console.log("           ✅ Found in process.env")
      return envVal
    }

    console.error("           ❌ Not found anywhere (checked: context, secrets, process.env)")
    return undefined
  }

  // Production: MUST resolve to external keys (execution context); never process.env
  if (!ctx) {
    console.error(`[getApiKey] ❌ No execution context in production for key ${name}`)
    return undefined
  }

  const principal = ctx.get("principal")
  console.log(`           Auth method: ${principal?.auth_method}`)

  const apiKeys = ctx.get("apiKeys") as Record<string, string> | undefined
  if (apiKeys?.[name]) {
    console.log("           ✅ Found in execution context apiKeys")
    return apiKeys[name]
  }

  const secrets = ctx.get("secrets")
  const secretValue = await secrets.get(name, "environment-variables")
  if (!secretValue) {
    console.error(
      `[getApiKey] ❌ ${providerName} API key not configured for user in production (auth_method: ${principal.auth_method})`,
    )
    console.error("           💡 User needs to add this API key in their account settings")
    return undefined
  }
  console.log("           ✅ Found in execution context secrets")
  return secretValue
}

// Re-export SecretResolver type for tests and consumers importing from core
export type { SecretResolver } from "@lucky/shared/contracts/ingestion"
