import { readFile } from "node:fs/promises"
import { authenticateRequest } from "@/lib/auth/principal"
import { ensureCoreInit } from "@/lib/ensure-core-init"
import { logException } from "@/lib/error-logger"
import { createSecretResolver } from "@/lib/lockbox/secretResolver"
import {
  extractTraceId,
  extractWorkflowOutput,
  formatErrorResponse,
  formatInternalError,
  formatSuccessResponse,
  formatWorkflowError,
} from "@/lib/mcp-invoke/response"
import { loadWorkflowConfig } from "@/lib/mcp-invoke/workflow-loader"
import { deleteWorkflowState, setWorkflowState, subscribeToCancellation } from "@/lib/redis/workflow-state"
import {
  FALLBACK_PROVIDER_KEYS,
  formatMissingProviders,
  getRequiredProviderKeys,
  validateProviderKeys,
} from "@/lib/workflow/provider-validation"
import { getExecutionContext, withExecutionContext } from "@lucky/core/context/executionContext"
import { invokeWorkflow } from "@lucky/core/workflow/runner/invokeWorkflow"
import type { InvocationInput } from "@lucky/core/workflow/runner/types"
import { genShortId, isNir } from "@lucky/shared"
import { ErrorCodes } from "@lucky/shared/contracts/invoke"
import type { WorkflowConfig } from "@lucky/shared/contracts/workflow"
import { type NextRequest, NextResponse } from "next/server"

/**
 * Active workflow entry with state tracking and TTL
 */
interface ActiveWorkflowEntry {
  controller: AbortController
  createdAt: number
  state: "running" | "cancelling" | "cancelled"
  cancelRequestedAt?: number
}

/**
 * In-memory store for active workflow abort controllers.
 * Maps request IDs to workflow entries for graceful cancellation.
 *
 * Note: In a multi-server production environment, this should be replaced
 * with a distributed store like Redis with pub/sub for real-time cancellation.
 */
export const activeWorkflows = new Map<string, ActiveWorkflowEntry>()

/**
 * TTL cleanup for stale workflow entries (prevents memory leaks)
 * Runs every 5 minutes, removes entries older than 2 hours
 */
const TTL_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes
const MAX_ENTRY_AGE = 2 * 60 * 60 * 1000 // 2 hours

const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [id, entry] of activeWorkflows.entries()) {
    if (now - entry.createdAt > MAX_ENTRY_AGE) {
      activeWorkflows.delete(id)
      console.warn(`[runner] Reaped stale workflow entry: ${id}`)
    }
  }
}, TTL_CHECK_INTERVAL)

// Don't keep the process alive just for cleanup
cleanupInterval.unref()

export async function POST(req: NextRequest) {
  // Ensure core is initialized
  ensureCoreInit()

  // Generate synthetic request ID for JSON-RPC response (not a real RPC request)
  // This ID is used as the cancellation token for the /api/workflow/cancel endpoint
  const requestId = `workflow-invoke-${genShortId()}`
  const startedAt = new Date().toISOString()

  // Initialize unsubscribe as no-op, will be replaced with real function if subscription succeeds
  const unsubscribe: () => Promise<void> = async () => {}

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
    const unsubscribe = await subscribeToCancellation(requestId, () => {
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

    const secrets = createSecretResolver(principal.clerk_id)

    // Extract workflow config to determine required providers
    let workflowConfig: WorkflowConfig | null = null
    try {
      if (input.dslConfig) {
        workflowConfig = input.dslConfig
      } else if (input.filename) {
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
    const requiredProviderKeys = workflowConfig
      ? getRequiredProviderKeys(workflowConfig, "workflow/invoke")
      : [...FALLBACK_PROVIDER_KEYS]

    // Pre-fetch required provider keys (only those actually needed by this workflow)
    const apiKeys = await secrets.getAll(requiredProviderKeys)

    // Validate all required keys are present for session-based auth
    if (principal.auth_method === "session") {
      const missingKeys = validateProviderKeys(requiredProviderKeys, apiKeys)

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

    const result = await withExecutionContext({ principal, secrets, apiKeys }, async () => {
      return invokeWorkflow({
        ...input,
        abortSignal: controller.signal,
      })
    })

    const finishedAt = new Date().toISOString()

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
      formatSuccessResponse(requestId, output, {
        requestId: result.data?.[0]?.workflowInvocationId || requestId,
        workflowId: input.workflowVersionId || input.filename || "dsl-config",
        startedAt,
        finishedAt,
        traceId,
      }),
      { status: 200 },
    )
  } catch (error) {
    // Cleanup on error: remove from active workflows map and Redis, unsubscribe from pub/sub
    activeWorkflows.delete(requestId)
    await deleteWorkflowState(requestId)
    await unsubscribe()

    logException(error, {
      location: "/api/workflow/invoke",
    })
    console.error("[/api/workflow/invoke] Unexpected error:", error)
    return NextResponse.json(formatInternalError(requestId, error), { status: 500 })
  }
}
