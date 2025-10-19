import { createSecretResolver } from "@/features/secret-management/lib/secretResolver"
import { authenticateRequest } from "@/lib/auth/principal"
import { logException } from "@/lib/error-logger"
import {
  extractTraceId,
  extractWorkflowOutput,
  formatErrorResponse,
  formatInternalError,
  formatSuccessResponse,
  formatWorkflowError,
} from "@/lib/mcp-invoke/response"
import { createSchemaValidationError, validateAgainstSchema } from "@/lib/mcp-invoke/schema-validator"
import { createInvocationInput, transformInvokeInput } from "@/lib/mcp-invoke/transform"
import { validateInvokeRequest } from "@/lib/mcp-invoke/validation"
import { loadWorkflowConfig } from "@/lib/mcp-invoke/workflow-loader"
import {
  formatMissingProviders,
  getRequiredProviderKeys,
  validateProviderKeys,
} from "@/lib/workflow/provider-validation"
import { WorkflowConfigurationError } from "@core/utils/errors/WorkflowErrors"
import { withExecutionContext } from "@lucky/core/context/executionContext"
import { invokeWorkflow } from "@lucky/core/workflow/runner/invokeWorkflow"
import { createLLMRegistry } from "@lucky/models"
import { isNir } from "@lucky/shared/utils/common/isNir"
import { type NextRequest, NextResponse } from "next/server"

/**
 * POST /api/v1/invoke
 * MCP JSON-RPC 2.0 compliant workflow invocation endpoint
 * Works for both HTTP webhooks and MCP tool calls
 */
export async function POST(req: NextRequest) {
  const startedAt = new Date().toISOString()
  let requestId: string | number | undefined

  try {
    // Parse body
    const body = await req.json()
    requestId = body.id

    // Validate JSON-RPC structure and request ID uniqueness
    const validationResult = validateInvokeRequest(body)
    if (!validationResult.success) {
      return NextResponse.json(formatErrorResponse(requestId ?? null, validationResult.error!), { status: 400 })
    }

    const rpcRequest = validationResult.data!
    requestId = rpcRequest.id

    // Unified authentication: API key or Clerk session
    const principal = await authenticateRequest(req)
    if (!principal) {
      return NextResponse.json(
        formatErrorResponse(requestId, {
          code: -32000,
          message: "Authentication required. Provide a valid API key or sign in.",
        }),
        { status: 401 },
      )
    }

    // Load workflow configuration to get input schema
    // For session auth users, return demo workflow if not found (better onboarding UX)
    // TODO: think if we really want to auto-run demo workflow for session auth users
    const workflowLoadResult = await loadWorkflowConfig(rpcRequest.params.workflow_id, principal, undefined, {
      returnDemoOnNotFound: principal.auth_method === "session",
    })
    if (!workflowLoadResult.success) {
      return NextResponse.json(formatErrorResponse(requestId, workflowLoadResult.error!), { status: 404 })
    }

    // possibly, the inputschema is defined.
    const { inputSchema, config } = workflowLoadResult

    // Validate input against workflow's input schema (if defined)
    if (inputSchema) {
      const schemaValidationResult = validateAgainstSchema(rpcRequest.params.input, inputSchema)
      if (!schemaValidationResult.valid) {
        return NextResponse.json(createSchemaValidationError(requestId, schemaValidationResult), { status: 400 })
      }
    }

    if (isNir(config)) {
      throw new WorkflowConfigurationError(`This workflow requires API keys that aren't configured.`, {
        field: "providers",
        expectedFormat: "array of provider names",
      })
    }

    // Transform MCP input to internal format
    const transformResult = transformInvokeInput(rpcRequest)
    if (!transformResult.success) {
      return NextResponse.json(formatErrorResponse(requestId, transformResult.error!), { status: 400 })
    }

    const transformed = transformResult.data!
    const invocationInput = createInvocationInput(transformed)

    // If we fell back to demo workflow, invoke using the DSL config directly
    // Otherwise, ensure we use the resolved workflow version id (handles parent IDs)
    let coreInvocationInput: any = invocationInput
    if (workflowLoadResult.source === "demo" && config) {
      coreInvocationInput = {
        evalInput: invocationInput.evalInput,
        dslConfig: config,
        validation: "none", // Skip validation for demo workflows (already validated)
      }
    } else if (workflowLoadResult.resolvedWorkflowVersionId) {
      coreInvocationInput.workflowVersionId = workflowLoadResult.resolvedWorkflowVersionId
    }

    // Use 'none' validation by default for immediate execution (workflows are validated on save)
    coreInvocationInput.validation = "none"

    // Create context-aware secret resolver for this user
    const secrets = createSecretResolver(principal.clerk_id, principal)

    // Extract required provider keys from workflow config
    const { providers, models } = getRequiredProviderKeys(config, "v1/invoke")

    // Pre-fetch required provider keys (only those actually needed by this workflow)
    const apiKeys = await secrets.getAll(Array.from(providers), "environment-variables")

    // Validate all required keys are present for session-based auth
    if (principal.auth_method === "session") {
      const missingKeys = validateProviderKeys(Array.from(providers), apiKeys)

      if (!isNir(missingKeys)) {
        const missingProviders = formatMissingProviders(missingKeys)
        console.error("[v1/invoke] Missing required API keys:", missingKeys)
        return NextResponse.json(
          formatErrorResponse(requestId, {
            code: -32000,
            message: `This workflow requires ${missingProviders.join(", ")} ${missingProviders.length === 1 ? "API key" : "API keys"} to run. Please configure ${missingProviders.length === 1 ? "it" : "them"} in Settings → Providers.`,
            data: { missingProviders, action: "configure_providers" },
          }),
          { status: 400 },
        )
      }
    }

    // Create registry with user/company API keys as fallback
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

    // Execute workflow within execution context with registry
    const result = await withExecutionContext({ principal, secrets, apiKeys, userModels }, async () => {
      return invokeWorkflow(coreInvocationInput)
    })

    const finishedAt = new Date().toISOString()

    if (!result.success) {
      return NextResponse.json(formatWorkflowError(requestId, result), { status: 500 })
    }

    const output = extractWorkflowOutput(result)
    const traceId = extractTraceId(result)

    // Return JSON-RPC success response
    const responseWorkflowId =
      workflowLoadResult.source === "demo"
        ? "wf_demo"
        : workflowLoadResult.resolvedWorkflowVersionId || transformed.workflowVersionId

    return NextResponse.json(
      formatSuccessResponse(requestId, output, {
        requestId: transformed.workflowId,
        workflowId: responseWorkflowId,
        startedAt,
        finishedAt,
        traceId,
      }),
      { status: 200 },
    )
  } catch (error) {
    logException(error, {
      location: "/api/v1/invoke",
    })
    console.error("MCP Invoke API Error:", error)
    return NextResponse.json(formatInternalError(requestId ?? null, error), {
      status: 500,
    })
  }
}
