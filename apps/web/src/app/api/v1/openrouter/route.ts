import { createLLMRegistryForUser } from "@/features/provider-llm-setup/lib/create-llm-registry"
import { type UserGateways, loadProviderApiKeys } from "@/features/provider-llm-setup/lib/load-user-providers"
import { createSecretResolver } from "@/features/secret-management/lib/secretResolver"
import { loadWorkflowConfig } from "@/features/workflow-or-chat-invocation/lib/config-load/database-workflow-loader"
import { InvalidWorkflowInputError } from "@/features/workflow-or-chat-invocation/lib/errors/workflowInputError"
import { loadMCPToolkitsForWorkflow } from "@/features/workflow-or-chat-invocation/lib/tools/mcp-toolkit-loader"
import { validateWorkflowInput } from "@/features/workflow-or-chat-invocation/lib/validation/input-validator"
import { activeWorkflows } from "@/features/workflow-or-chat-invocation/workflow/active-workflows"
import { alrighty, fail, handleBody, isHandleBodyError } from "@/lib/api/server"
import { authenticateRequest } from "@/lib/auth/principal"
import { ensureCoreInit } from "@/lib/ensure-core-init"
import { logException } from "@/lib/error-logger"
import {
  formatGatewayDisplayNames,
  getRequiredGateways,
  validateGatewayKeys,
} from "@/lib/validation/gateway-validation"
import { withExecutionContext } from "@lucky/core/context/executionContext"
import { getObservationContext, withObservationContext } from "@lucky/core/context/observationContext"
import { AgentObserver } from "@lucky/core/utils/observability/AgentObserver"
import { ObserverRegistry } from "@lucky/core/utils/observability/ObserverRegistry"
import { getProviderKeyName } from "@lucky/core/workflow/provider-extraction"
import { invokeWorkflow } from "@lucky/core/workflow/runner/invokeWorkflow"
import type { InvocationInput } from "@lucky/core/workflow/runner/types"
import { findModel, getModelsByGateway } from "@lucky/models/llm-catalog/catalog-queries"
import { type WorkflowConfigZ, genShortId } from "@lucky/shared"
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
      return fail("v1/openrouter", "Authentication required", { status: 401 })
    }

    // Parse request body
    const parsed = await handleBody("v1/openrouter", req)
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
      return fail("v1/openrouter", "Invalid request: must specify workflowVersionId, filename, or dslConfig", {
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
      return fail("v1/openrouter", "Workflow not found", { status: 404 })
    }

    // Fix model IDs to ensure they use the correct gatewayModelId from catalog
    const fixWrongModelsInConfig = (dsl: WorkflowConfigZ) => {
      const newConfig: WorkflowConfigZ = {
        nodes: [],
        entryNodeId: dsl.entryNodeId,
      }
      const nodes = dsl.nodes
      for (const node of nodes) {
        node.gatewayModelId = findModel(node.gatewayModelId)?.gatewayModelId ?? node.gatewayModelId
        newConfig.nodes.push(node)
      }
      return newConfig
    }

    load.config = fixWrongModelsInConfig(load.config)

    // Secrets & gateways
    const secrets = createSecretResolver(principal.clerk_id, principal)

    // Only fetch what the workflow needs
    const { gateways } = getRequiredGateways(load.config, "v1/openrouter")
    // 1) User BYOK (preferred)
    const userGateways = await loadProviderApiKeys(secrets)
    // 2) Env/company fallback (namespaced) — allowed only for API-key auth
    const envFallback =
      principal.auth_method === "api_key" ? await secrets.getAll(Array.from(gateways), "environment-variables") : {}
    // Build consolidated gateway map with correct precedence
    const consolidated: UserGateways = {}
    for (const g of gateways) {
      const key = userGateways[g] ?? envFallback[g]
      if (key) consolidated[g] = key
    }

    // For session-auth, enforce presence
    if (principal.auth_method === "session") {
      const missingGateways = validateGatewayKeys(Array.from(gateways), consolidated)
      if (missingGateways.length) {
        const missingKeyNames = missingGateways.map(getProviderKeyName)
        const display = formatGatewayDisplayNames(missingKeyNames)
        await cleanup()
        const msg = `This workflow requires ${display.join(", ")} ${display.length === 1 ? "API key" : "API keys"} to run. Configure ${display.length === 1 ? "it" : "them"} in Settings → Providers.`
        return fail("v1/openrouter", msg, { status: 400 })
      }
    }

    // OpenRouter endpoint: Use ALL available models for all gateways, not just user-enabled ones
    // This allows the endpoint to work out-of-the-box without requiring model configuration
    const allModelsForGateways = Array.from(gateways).flatMap(gateway => getModelsByGateway(gateway))

    const userModels = await createLLMRegistryForUser({
      principal,
      userProviders: consolidated,
      userEnabledModels: allModelsForGateways,
      fallbackKeys: consolidated,
    })

    // Optional MCP toolkits
    const mcpToolkits = await loadMCPToolkitsForWorkflow(principal)

    // Observer hookup
    const obsId = genShortId()
    const observer = new AgentObserver()
    const registry = ObserverRegistry.getInstance()
    registry.register(obsId, observer)

    // Build evalInput for prompt-only invocation
    // This endpoint expects a simple prompt, not full evaluation inputs
    if (!parsed.prompt) {
      await cleanup()
      return fail("v1/openrouter", "Missing 'prompt' in request body", { status: 400 })
    }

    const evalInput = {
      type: "prompt-only" as const,
      goal: parsed.prompt,
      workflowId: parsed.workflowId ?? `wf_id_${genShortId()}`,
    }

    // Build core InvocationInput
    const invocationInput: InvocationInput = {
      source,
      evalInput,
      validation: "strict",
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
      return fail("v1/openrouter", errMsg, { status: 500 })
    }

    const traceId = result.data?.[0]?.workflowInvocationId ?? requestId
    const payload = {
      output: result,
      invocationId: requestId,
      traceId,
      startedAt,
      finishedAt,
    }

    return alrighty("v1/openrouter", { success: true, data: payload })
  } catch (error) {
    await cleanup()
    if (error instanceof InvalidWorkflowInputError) {
      return fail("v1/openrouter", error.message, { status: 403 })
    }
    logException(error, { location: "/api/v1/openrouter" })
    return fail("v1/openrouter", `Unexpected error: ${String(error)}`, { status: 500 })
  }
}
