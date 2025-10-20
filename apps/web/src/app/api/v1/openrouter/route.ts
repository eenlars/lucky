import {
  type WorkflowLoadResult,
  loadWorkflowConfig,
} from "@/features/workflow-or-chat-invocation/lib/config-load/database-workflow-loader"
import { InvalidWorkflowInputError } from "@/features/workflow-or-chat-invocation/lib/errors/workflowInputError"
import { validateWorkflowInput } from "@/features/workflow-or-chat-invocation/lib/validation/input-validator"
import { activeWorkflows } from "@/features/workflow-or-chat-invocation/workflow/active-workflows"
import { fail, handleBody, isHandleBodyError } from "@/lib/api/server"
import { authenticateRequest } from "@/lib/auth/principal"
import { ensureCoreInit } from "@/lib/ensure-core-init"
import { logException } from "@/lib/error-logger"
import { getObservationContext } from "@lucky/core/context/observationContext"
import { ObserverRegistry } from "@lucky/core/utils/observability/ObserverRegistry"
import type { InvocationSource } from "@lucky/core/workflow/runner/types"
import { getModelsByGateway } from "@lucky/models"
import { findModel } from "@lucky/models/llm-catalog/catalog-queries"
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

    const models = load.config.nodes.map(n => n.gatewayModelId)
    const openrouterEnabled = getModelsByGateway("openrouter-api").filter(entry => entry.runtimeEnabled !== false)

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
  } catch (error) {
    await cleanup()
    if (error instanceof InvalidWorkflowInputError) {
      return fail("v1/openrouter", error.message, { status: 403 })
    }
    logException(error, { location: "/api/v1/invoke" })
    return fail("v1/openrouter", `Unexpected error: ${String(error)}`, { status: 500 })
  }
}
