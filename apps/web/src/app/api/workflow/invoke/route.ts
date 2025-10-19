import { readFile } from "node:fs/promises"
import { createSecretResolver } from "@/features/secret-management/lib/secretResolver"
import { authenticateRequest } from "@/lib/auth/principal"
import { ensureCoreInit } from "@/lib/ensure-core-init"
import { logException } from "@/lib/error-logger"
import {
  extractTraceId,
  extractWorkflowOutput,
  formatErrorResponse,
  formatInternalError,
  formatSuccessResponse,
  formatWorkflowError,
} from "@/lib/mcp-invoke/response"
import { loadWorkflowConfig } from "@/lib/mcp-invoke/workflow-loader"
import { loadMCPToolkitsFromDatabase } from "@/lib/mcp/database-toolkit-loader"
import { mergeMCPToolkits } from "@/lib/mcp/merge-toolkits"
import { deleteWorkflowState, setWorkflowState, subscribeToCancellation } from "@/lib/redis/workflow-state"
import { activeWorkflows } from "@/lib/workflow/active-workflows"
import {
  FALLBACK_PROVIDER_KEYS,
  formatMissingProviders,
  getRequiredProviderKeys,
  validateProviderKeys,
} from "@/lib/workflow/provider-validation"
import { getExecutionContext, withExecutionContext } from "@lucky/core/context/executionContext"
import { getObservationContext, withObservationContext } from "@lucky/core/context/observationContext"
import { AgentObserver } from "@lucky/core/utils/observability/AgentObserver"
import { ObserverRegistry } from "@lucky/core/utils/observability/ObserverRegistry"
import { invokeWorkflow } from "@lucky/core/workflow/runner/invokeWorkflow"
import type { InvocationInput } from "@lucky/core/workflow/runner/types"
import { createLLMRegistry } from "@lucky/models"
import { type MCPToolkitMap, genShortId, isNir, uiConfigToToolkits } from "@lucky/shared"
import { ErrorCodes } from "@lucky/shared/contracts/invoke"
import type { WorkflowConfig } from "@lucky/shared/contracts/workflow"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  // Ensure core is initialized
  ensureCoreInit()

  // Generate synthetic request ID for JSON-RPC response (not a real RPC request)
  // This ID is used as the cancellation token for the /api/workflow/cancel endpoint
  const requestId = `workflow-invoke-${genShortId()}`
  const startedAt = new Date().toISOString()

  // Initialize unsubscribe as no-op, will be replaced with real function if subscription succeeds
  let unsubscribe: () => Promise<void> = async () => {}

  try {
    const body = await req.json()
    const input = body as InvocationInput

    if (!input) {
      return NextResponse.json(
        formatErrorResponse(requestId, {
          code: ErrorCodes.INVALID_REQUEST,
          message: "Invalid invocation input",
        }),
        { status: 400 },
      )
    }

    // Create abort controller for cancellation support
    // The requestId serves as the cancellation token
    const controller = new AbortController()
    const now = Date.now()

    activeWorkflows.set(requestId, {
      controller,
      createdAt: now,
      state: "running",
    })

    // Store workflow state in Redis (with memory fallback)
    await setWorkflowState(requestId, {
      state: "running",
      desired: "running",
      createdAt: now,
      startedAt: now,
    })

    // Subscribe to Redis pub/sub for distributed cancellation
    // When cancel signal arrives from another server, trigger local abort controller
    unsubscribe = await subscribeToCancellation(requestId, () => {
      console.log(`[workflow/invoke] Received Redis cancel signal for ${requestId}`)
      const entry = activeWorkflows.get(requestId)
      if (entry) {
        entry.state = "cancelling"
        entry.cancelRequestedAt = Date.now()
        entry.controller.abort()
      }
    })

    // Check if we already have execution context (from upstream caller like /api/v1/invoke)
    const existingContext = getExecutionContext()

    if (existingContext) {
      // Context already set, just invoke
      const result = await invokeWorkflow({
        ...input,
        abortSignal: controller.signal,
      })

      // Cleanup: remove from active workflows map and Redis, unsubscribe from pub/sub
      activeWorkflows.delete(requestId)
      await deleteWorkflowState(requestId)
      await unsubscribe()

      if (!result.success) {
        console.error("[/api/workflow/invoke] Workflow invocation failed:", result.error)
        return NextResponse.json(formatWorkflowError(requestId, result), { status: 500 })
      }

      const finishedAt = new Date().toISOString()
      const output = extractWorkflowOutput(result)
      const traceId = extractTraceId(result)

      return NextResponse.json(
        formatSuccessResponse(requestId, output, {
          requestId: result.data?.[0]?.workflowInvocationId || requestId,
          workflowId: input.workflowVersionId || input.filename || "dsl-config",
          startedAt,
          finishedAt,
          traceId,
        }),
        { status: 200 },
      )
    }

    // No context set, this is a direct call - authenticate and create context
    const principal = await authenticateRequest(req)
    if (!principal) {
      return NextResponse.json(
        formatErrorResponse(requestId, {
          code: ErrorCodes.INVALID_AUTH,
          message: "Authentication required",
        }),
        { status: 401 },
      )
    }

    console.log("[workflow/invoke] Principal auth_method:", principal.auth_method)
    console.log("[workflow/invoke] Principal clerk_id:", principal.clerk_id)

    // SECURITY: UI users (session auth) should NEVER use filename parameter
    // Only local development (api_key auth) should load from filesystem
    if (principal.auth_method === "session" && input.filename) {
      console.error("[workflow/invoke] SECURITY: UI user attempted to load workflow from file path:", input.filename)
      return NextResponse.json(
        formatErrorResponse(requestId, {
          code: ErrorCodes.INVALID_REQUEST,
          message: "Loading workflows from file paths is not allowed. Please use workflow IDs from your dashboard.",
        }),
        { status: 403 },
      )
    }

    const secrets = createSecretResolver(principal.clerk_id, principal)

    // Load MCP configurations from both database and lockbox
    let mcpToolkits: MCPToolkitMap | undefined
    if (principal.auth_method === "session" && process.env.NODE_ENV !== "production") {
      try {
        // Load from database
        const databaseToolkits = await loadMCPToolkitsFromDatabase(principal.clerk_id)

        // Load from lockbox
        let lockboxToolkits: MCPToolkitMap | undefined
        try {
          const mcpConfigJson = await secrets.get("servers", "mcp")

          if (mcpConfigJson) {
            const mcpConfig = JSON.parse(mcpConfigJson) as {
              mcpServers: Record<string, { command: string; args: string[]; env?: Record<string, string> }>
            }

            if (Object.keys(mcpConfig.mcpServers).length > 0) {
              lockboxToolkits = uiConfigToToolkits(mcpConfig.mcpServers)
            }
          }
        } catch (error) {
          console.warn("[workflow/invoke] Failed to load MCP config from lockbox:", error)
        }

        // Merge toolkits (database takes precedence over lockbox)
        mcpToolkits = mergeMCPToolkits(databaseToolkits, lockboxToolkits)

        if (!mcpToolkits) {
          console.log("[workflow/invoke] No MCP configs found in database or lockbox")
        }
      } catch (error) {
        console.warn("[workflow/invoke] Failed to load MCP configs, continuing without toolkits:", error)
      }
    }

    // Extract workflow config to determine required providers
    let workflowConfig: WorkflowConfig | null = null
    try {
      if (input.dslConfig) {
        workflowConfig = input.dslConfig
      } else if (input.filename) {
        // Only reachable for api_key auth (local development)
        const fileContent = await readFile(input.filename, "utf-8")
        workflowConfig = JSON.parse(fileContent)
      } else if (input.workflowVersionId) {
        const loadResult = await loadWorkflowConfig(input.workflowVersionId)
        if (loadResult.success && loadResult.config) {
          workflowConfig = loadResult.config
        }
      }
    } catch (error) {
      console.warn("[workflow/invoke] Failed to load workflow config for provider extraction:", error)
    }

    // Extract providers required by this workflow for targeted validation
    const { providers, models } = workflowConfig
      ? getRequiredProviderKeys(workflowConfig, "workflow/invoke")
      : { providers: new Set(FALLBACK_PROVIDER_KEYS), models: new Map() }

    // Pre-fetch required provider keys (only those actually needed by this workflow)
    const apiKeys = await secrets.getAll(Array.from(providers), "environment-variables")

    // Validate all required keys are present for session-based auth
    if (principal.auth_method === "session") {
      const missingKeys = validateProviderKeys(Array.from(providers), apiKeys)

      if (!isNir(missingKeys)) {
        const missingProviders = formatMissingProviders(missingKeys)
        console.error("[workflow/invoke] Missing required API keys:", missingKeys)
        return NextResponse.json(
          formatErrorResponse(requestId, {
            code: ErrorCodes.MISSING_API_KEYS,
            message: `This workflow requires ${missingProviders.join(", ")} ${missingProviders.length === 1 ? "API key" : "API keys"} to run. Please configure ${missingProviders.length === 1 ? "it" : "them"} in Settings → Providers.`,
            data: { missingProviders, action: "configure_providers" },
          }),
          { status: 400 },
        )
      }
    }

    // Create observer for real-time event streaming
    const randomId = genShortId()
    const observer = new AgentObserver()
    const registry = ObserverRegistry.getInstance()
    registry.register(randomId, observer)

    // Create registry with user's API keys as fallback
    const llmRegistry = createLLMRegistry({
      fallbackKeys: {
        openai: apiKeys.OPENAI_API_KEY,
        groq: apiKeys.GROQ_API_KEY,
        openrouter: apiKeys.OPENROUTER_API_KEY,
      },
    })

    const userModels = llmRegistry.forUser({
      mode: "byok",
      userId: principal.clerk_id,
      models: Array.from(models.values()).flat(),
      apiKeys: {
        openai: apiKeys.OPENAI_API_KEY,
        groq: apiKeys.GROQ_API_KEY,
        openrouter: apiKeys.OPENROUTER_API_KEY,
      },
    })

    const result = await withExecutionContext(
      {
        principal,
        secrets,
        apiKeys,
        userModels,
        // Pass MCP toolkits in execution context (if available)
        ...(mcpToolkits ? { mcp: { toolkits: mcpToolkits } } : {}),
      },
      async () => {
        return withObservationContext({ randomId, observer }, async () => {
          return invokeWorkflow({
            ...input,
            abortSignal: controller.signal,
          })
        })
      },
    )

    const finishedAt = new Date().toISOString()

    // Dispose observer after workflow completion (will auto-cleanup via TTL if not disposed)
    setTimeout(
      () => {
        observer.dispose()
        registry.dispose(randomId)
      },
      5 * 60 * 1000,
    )

    // Cleanup: remove from active workflows map and Redis, unsubscribe from pub/sub
    activeWorkflows.delete(requestId)
    await deleteWorkflowState(requestId)
    await unsubscribe()

    if (!result.success) {
      console.error("[/api/workflow/invoke] Workflow invocation failed:", result.error)
      return NextResponse.json(formatWorkflowError(requestId, result), { status: 500 })
    }

    const output = extractWorkflowOutput(result)
    const traceId = extractTraceId(result)

    return NextResponse.json(
      formatSuccessResponse(
        requestId,
        output,
        {
          requestId: result.data?.[0]?.workflowInvocationId || requestId,
          workflowId: input.workflowVersionId || input.filename || "dsl-config",
          startedAt,
          finishedAt,
          traceId,
        },
        randomId,
      ),
      { status: 200 },
    )
  } catch (error) {
    // Cleanup on error: remove from active workflows map and Redis, unsubscribe from pub/sub
    activeWorkflows.delete(requestId)
    await deleteWorkflowState(requestId)
    await unsubscribe()

    // Dispose observer if it was created (randomId will be in scope if observer was registered)
    try {
      const randomId = getObservationContext()?.randomId
      if (randomId) {
        const registry = ObserverRegistry.getInstance()
        const observer = registry.get(randomId)
        observer?.dispose()
        registry.dispose(randomId)
      }
    } catch (cleanupError) {
      console.error("[/api/workflow/invoke] Error during observer cleanup:", cleanupError)
    }

    logException(error, {
      location: "/api/workflow/invoke",
    })
    console.error("[/api/workflow/invoke] Unexpected error:", error)
    return NextResponse.json(formatInternalError(requestId, error), { status: 500 })
  }
}
