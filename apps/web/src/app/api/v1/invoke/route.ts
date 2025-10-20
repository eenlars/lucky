import { createLLMRegistryForUser } from "@/features/provider-llm-setup/lib/create-llm-registry"
import { loadProviderApiKeys } from "@/features/provider-llm-setup/lib/load-user-providers"
import { getUserModelsSetup } from "@/features/provider-llm-setup/lib/user-models-get"
import { createSecretResolver } from "@/features/secret-management/lib/secretResolver"
import { loadWorkflowConfig } from "@/features/workflow-or-chat-invocation/lib/config-load/database-workflow-loader"
import { InvalidWorkflowInputError } from "@/features/workflow-or-chat-invocation/lib/errors/workflowInputError"
import { loadMCPToolkitsForWorkflow } from "@/features/workflow-or-chat-invocation/lib/tools/mcp-toolkit-loader"
import { validateWorkflowInput } from "@/features/workflow-or-chat-invocation/lib/validation/input-validator"
import {
  formatMissingProviders,
  getRequiredProviderKeys,
  validateProviderKeys,
} from "@/features/workflow-or-chat-invocation/lib/validation/provider-validation"
import { activeWorkflows } from "@/features/workflow-or-chat-invocation/workflow/active-workflows"
import { alrighty, fail, handleBody, isHandleBodyError } from "@/lib/api/server"
import { authenticateRequest } from "@/lib/auth/principal"
import { ensureCoreInit } from "@/lib/ensure-core-init"
import { logException } from "@/lib/error-logger"
import { withExecutionContext } from "@lucky/core/context/executionContext"
import { getObservationContext, withObservationContext } from "@lucky/core/context/observationContext"
import { AgentObserver } from "@lucky/core/utils/observability/AgentObserver"
import { ObserverRegistry } from "@lucky/core/utils/observability/ObserverRegistry"
import { invokeWorkflow } from "@lucky/core/workflow/runner/invokeWorkflow"
import type { InvocationInput } from "@lucky/core/workflow/runner/types"
import { genShortId } from "@lucky/shared"
import type { NextRequest } from "next/server"

export async function POST(req: NextRequest) {
  ensureCoreInit()

  const startedAt = new Date().toISOString()
  const requestId = `workflow-invoke-${genShortId()}`
  const controller = new AbortController()

  activeWorkflows.set(requestId, { controller, createdAt: Date.now(), state: "running" })

  const cleanup = async () => {
    activeWorkflows.delete(requestId)
    // Observer cleanup if any was registered
    try {
      const ctx = getObservationContext()
      if (ctx?.randomId) {
        const registry = ObserverRegistry.getInstance()
        registry.get(ctx.randomId)?.dispose()
        registry.dispose(ctx.randomId)
      }
    } catch {}
  }

  try {
    // Auth
    const principal = await authenticateRequest(req)
    if (!principal) {
      await cleanup()
      return fail("workflow/invoke", "Authentication required", { status: 401 })
    }

    // Parse request body
    const parsed = await handleBody("workflow/invoke", req)
    if (isHandleBodyError(parsed)) {
      await cleanup()
      return parsed
    }

    // Determine source from parsed input
    let source: any
    if ("workflowVersionId" in parsed) {
      source = { kind: "version", id: parsed.workflowVersionId }
    } else if ("filename" in parsed) {
      source = { kind: "filename", path: parsed.filename }
    } else if ("dslConfig" in parsed) {
      source = { kind: "dsl", config: parsed.dslConfig }
    } else {
      await cleanup()
      return fail("workflow/invoke", "Invalid request: must specify workflowVersionId, filename, or dslConfig", {
        status: 400,
      })
    }

    // Security validation (e.g., filename only allowed for api_key auth)
    validateWorkflowInput(principal, source.kind === "filename" ? source.path : undefined)

    // Load workflow config (database resolves parent→latest; demo fallback preserved)
    // - For DSL: we skip DB load; for version/parent we load to get schemas and provider requirements
    const load =
      source.kind === "dsl"
        ? {
            success: true as const,
            config: source.config,
            inputSchema: source.config?.inputSchema,
            resolvedWorkflowVersionId: undefined,
            source: "dsl" as const,
          }
        : await loadWorkflowConfig(source.id, principal, undefined, {
            returnDemoOnNotFound: principal.auth_method === "session",
          })

    if (!load?.success || !load.config) {
      await cleanup()
      return fail("workflow/invoke", "Workflow not found", { status: 404 })
    }

    // Secrets & providers
    const secrets = createSecretResolver(principal.clerk_id, principal)

    // Only fetch what the workflow needs
    const { providers } = getRequiredProviderKeys(load.config, "workflow/invoke")
    // 1) User BYOK (preferred)
    const userProviders = await loadProviderApiKeys(secrets)
    // 2) Env/company fallback (namespaced) — allowed only for API-key auth
    const envFallback =
      principal.auth_method === "api_key" ? await secrets.getAll(Array.from(providers), "environment-variables") : {}
    // Build consolidated provider map with correct precedence
    const consolidated: Record<string, string> = {}
    for (const p of providers) {
      const key = userProviders[p as keyof typeof userProviders] ?? envFallback[p]
      if (key) consolidated[p] = key
    }

    // For session-auth, enforce presence
    if (principal.auth_method === "session") {
      const missing = validateProviderKeys(Array.from(providers), consolidated)
      if (missing.length) {
        const display = formatMissingProviders(missing)
        await cleanup()
        const msg = `This workflow requires ${display.join(", ")} ${display.length === 1 ? "API key" : "API keys"} to run. Configure ${display.length === 1 ? "it" : "them"} in Settings → Providers.`
        return fail("workflow/invoke", msg, { status: 400 })
      }
    }

    // Models & registry
    const enabledModels = await getUserModelsSetup({ principal }, Array.from(providers) as any)
    const userModels = await createLLMRegistryForUser({
      principal,
      userProviders: consolidated as any,
      userEnabledModels: enabledModels,
      fallbackKeys: consolidated,
    })

    // Optional MCP toolkits
    const mcpToolkits = await loadMCPToolkitsForWorkflow(principal)

    // Observer hookup
    const obsId = genShortId()
    const observer = new AgentObserver()
    const registry = ObserverRegistry.getInstance()
    registry.register(obsId, observer)

    // Build core InvocationInput
    const invocationInput: InvocationInput = {
      source,
      evalInput: parsed.evalInput,
      validation: parsed.validation ?? "strict",
      abortSignal: controller.signal,
    }

    // Execute
    const result = await withExecutionContext(
      {
        principal,
        secrets,
        apiKeys: consolidated,
        userModels,
        ...(mcpToolkits ? { mcp: { toolkits: mcpToolkits } } : {}),
      },
      async () => withObservationContext({ randomId: obsId, observer }, async () => invokeWorkflow(invocationInput)),
    )

    const finishedAt = new Date().toISOString()

    // Cleanup observer shortly after completion
    setTimeout(
      () => {
        observer.dispose()
        registry.dispose(obsId)
      },
      5 * 60 * 1000,
    )

    await cleanup()

    if (!result?.success) {
      const errMsg = result?.error ?? "Workflow invocation failed"
      return fail("workflow/invoke", errMsg, { status: 500 })
    }

    const traceId = result.data?.[0]?.workflowInvocationId ?? requestId
    const payload = {
      output: result,
      invocationId: requestId,
      traceId,
      startedAt,
      finishedAt,
    }

    return alrighty("workflow/invoke", { success: true, data: payload })
  } catch (error) {
    await cleanup()
    if (error instanceof InvalidWorkflowInputError) {
      return fail("workflow/invoke", error.message, { status: 403 })
    }
    logException(error, { location: "/api/v1/invoke" })
    return fail("workflow/invoke", `Unexpected error: ${String(error)}`, { status: 500 })
  }
}
