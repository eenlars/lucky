import { createSecretResolver } from "@/features/secret-management/lib/secretResolver"
import {
  InvalidWorkflowInputError,
  MissingApiKeysError,
  NoEnabledModelsError,
  type ProviderModelResult,
  SchemaValidationError,
  formatInvalidInputResponse,
  loadMCPToolkitsForWorkflow,
  loadProvidersAndModels,
  validateWorkflowInput,
  validateWorkflowInputSchema,
} from "@/features/workflow-invocation/lib"
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
import { deleteWorkflowState, setWorkflowState, subscribeToCancellation } from "@/lib/redis/workflow-state"
import { activeWorkflows } from "@/lib/workflow/active-workflows"
import { withExecutionContext } from "@lucky/core/context/executionContext"
import { getObservationContext, withObservationContext } from "@lucky/core/context/observationContext"
import { AgentObserver } from "@lucky/core/utils/observability/AgentObserver"
import { ObserverRegistry } from "@lucky/core/utils/observability/ObserverRegistry"
import { invokeWorkflow } from "@lucky/core/workflow/runner/invokeWorkflow"
import type { InvocationInput } from "@lucky/core/workflow/runner/types"
import { genShortId } from "@lucky/shared"
import { ErrorCodes } from "@lucky/shared/contracts/invoke"
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

    // Authenticate request
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

    // Validate workflow input against security constraints
    try {
      validateWorkflowInput(principal, input.filename)
    } catch (error) {
      if (error instanceof InvalidWorkflowInputError) {
        const { body, status } = formatInvalidInputResponse(requestId, error)
        return NextResponse.json(body, { status })
      }
      throw error
    }

    const secrets = createSecretResolver(principal.clerk_id, principal)

    // Load MCP toolkits from database
    const mcpToolkits = await loadMCPToolkitsForWorkflow(principal)

    // Load and resolve providers/models for this workflow
    let providerModelResult: ProviderModelResult
    try {
      providerModelResult = await loadProvidersAndModels(input, principal, secrets)
    } catch (error) {
      // Handle missing API keys
      if (error instanceof MissingApiKeysError) {
        console.error("[workflow/invoke] Missing required API keys:", error.missingKeys)
        return NextResponse.json(
          formatErrorResponse(requestId, {
            code: ErrorCodes.MISSING_API_KEYS,
            message: `This workflow requires ${error.missingProviders.join(", ")} ${error.missingProviders.length === 1 ? "API key" : "API keys"} to run. Please configure ${error.missingProviders.length === 1 ? "it" : "them"} in Settings → Providers.`,
            data: { missingProviders: error.missingProviders, action: "configure_providers" },
          }),
          { status: 400 },
        )
      }

      // Handle schema validation errors
      if (error instanceof SchemaValidationError) {
        console.error("[workflow/invoke] Schema validation failed:", error.errorMessage)
        return NextResponse.json(
          formatErrorResponse(requestId, {
            code: ErrorCodes.INVALID_REQUEST,
            message: "Input validation failed",
            data: {
              errors: error.details,
              summary: error.errorMessage,
            },
          }),
          { status: 400 },
        )
      }

      // Handle no enabled models
      if (error instanceof NoEnabledModelsError) {
        console.error("[workflow/invoke] No enabled models:", error.provider)
        return NextResponse.json(
          formatErrorResponse(requestId, {
            code: ErrorCodes.INVALID_REQUEST,
            message: `No enabled models found for provider: ${error.provider}. Please enable models in Settings → Providers.`,
            data: { action: "configure_providers" },
          }),
          { status: 400 },
        )
      }

      // Re-throw unexpected errors
      throw error
    }

    const { apiKeys, userModels } = providerModelResult

    // Create observer for real-time event streaming
    const randomId = genShortId()
    const observer = new AgentObserver()
    const registry = ObserverRegistry.getInstance()
    registry.register(randomId, observer)

    // Execute workflow with resolved models and API keys
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
