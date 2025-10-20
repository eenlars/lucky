import { createLLMRegistryForUser } from "@/features/provider-llm-setup/lib/create-llm-registry"
import { loadProviderApiKeys } from "@/features/provider-llm-setup/lib/load-user-providers"
import { createSecretResolver } from "@/features/secret-management/lib/secretResolver"
import {
  type WorkflowLoadResult,
  loadWorkflowConfig,
} from "@/features/workflow-or-chat-invocation/lib/config-load/database-workflow-loader"
import { InvalidWorkflowInputError } from "@/features/workflow-or-chat-invocation/lib/errors/workflowInputError"
import { loadMCPToolkitsForWorkflow } from "@/features/workflow-or-chat-invocation/lib/tools/mcp-toolkit-loader"
import { validateWorkflowInput } from "@/features/workflow-or-chat-invocation/lib/validation/input-validator"
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
import type { InvocationInput, InvocationSource } from "@lucky/core/workflow/runner/types"
import { toNormalModelName } from "@lucky/models/llm-catalog/catalog-queries"
import { type WorkflowConfigZ, genShortId } from "@lucky/shared"
import { getModelsByProvider } from "@repo/models"
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
    let source: InvocationSource
    if ("workflowVersionId" in parsed && parsed.workflowVersionId) {
      source = { kind: "version", id: parsed.workflowVersionId }
    } else if ("dslConfig" in parsed && parsed.dslConfig) {
      source = { kind: "dsl", config: parsed.dslConfig }
    } else if ("filename" in parsed) {
      throw new Error("Not possible with filename")
    } else {
      await cleanup()
      return fail("v1/openrouter", "Invalid request: must specify workflowVersionId, filename, or dslConfig", {
        status: 400,
      })
    }

    // Security validation (e.g., filename only allowed for api_key auth)
    validateWorkflowInput(principal, undefined)

    // Load workflow config (database resolves parent→latest; demo fallback preserved)
    // - For DSL: we skip DB load; for version/parent we load to get schemas and provider requirements
    const load: WorkflowLoadResult =
      source.kind === "dsl"
        ? {
            success: true as const,
            config: source.config,
            inputSchema: source.config?.inputSchema,
            resolvedWorkflowVersionId: undefined,
            source,
          }
        : await loadWorkflowConfig(source.id, principal, undefined, {
            returnDemoOnNotFound: principal.auth_method === "session",
          })

    if (!load?.success || !load.config) {
      await cleanup()
      return fail("v1/openrouter", "Workflow not found", { status: 404 })
    }

    const models = load.config.nodes.map(n => toNormalModelName(n.modelName))
    const openrouterEnabled = getModelsByProvider("openrouter").filter(entry => entry.runtimeEnabled)

    const fixWrongModelsInConfig = (dsl: WorkflowConfigZ) => {
      const newConfig: WorkflowConfigZ = {
        nodes: [],
        entryNodeId: dsl.entryNodeId,
      }
      const nodes = dsl.nodes
      for (const node of nodes) {
        if (!node.modelName.startsWith("openrouter#")) {
          node.modelName = "google/gemini-2.5-flash"
        } else {
          node.modelName = toNormalModelName(node.modelName)
        }
        newConfig.nodes.push(node)
      }
      return newConfig
    }

    load.config = fixWrongModelsInConfig(load.config)

    // Secrets & providers
    const secrets = createSecretResolver(principal.clerk_id, principal)

    const userProviders = await loadProviderApiKeys(secrets)
    if (!userProviders.openrouter)
      return fail("v1/openrouter", "Openrouter key must be set. This can be done in settings.")

    const userModels = await createLLMRegistryForUser({
      principal,
      userProviders,
      userEnabledModels: openrouterEnabled,
    })

    // Optional MCP toolkits
    const mcpToolkits = await loadMCPToolkitsForWorkflow(principal)

    // Observer hookup
    const obsId = genShortId()
    const observer = new AgentObserver()
    const registry = ObserverRegistry.getInstance()
    registry.register(obsId, observer)

    const id = parsed.workflowId ?? `wf_${genShortId()}`

    // Build core InvocationInput
    const invocationInput: InvocationInput = {
      source,
      evalInput: {
        type: "prompt-only",
        goal: parsed.prompt,
        workflowId: id,
      },
      validation: "strict",
      abortSignal: controller.signal,
    }

    // Execute
    const result = await withExecutionContext(
      {
        principal,
        secrets,
        apiKeys: { openrouter: userProviders.openrouter },
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
    logException(error, { location: "/api/v1/invoke" })
    return fail("v1/openrouter", `Unexpected error: ${String(error)}`, { status: 500 })
  }
}
