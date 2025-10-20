import { getExecutionContext } from "@lucky/core/context/executionContext"
import { getProviderDisplayName } from "@lucky/core/workflow/provider-extraction"

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
