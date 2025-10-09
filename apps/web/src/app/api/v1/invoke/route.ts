import { authenticateRequest } from "@/lib/auth/principal"
import { createSecretResolver } from "@/lib/lockbox/secretResolver"
import {
  createInvocationInput,
  createSchemaValidationError,
  extractTraceId,
  extractWorkflowOutput,
  formatErrorResponse,
  formatInternalError,
  formatSuccessResponse,
  formatWorkflowError,
  transformInvokeInput,
  validateAgainstSchema,
  validateInvokeRequest,
} from "@/lib/mcp-invoke"
import { loadWorkflowConfig } from "@/lib/mcp-invoke/workflow-loader"
import { withExecutionContext } from "@lucky/core/context/executionContext"
import { invokeWorkflow } from "@lucky/core/workflow/runner/invokeWorkflow"
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
    const workflowLoadResult = await loadWorkflowConfig(rpcRequest.params.workflow_id)
    if (!workflowLoadResult.success) {
      return NextResponse.json(formatErrorResponse(requestId, workflowLoadResult.error!), { status: 404 })
    }

    const { inputSchema } = workflowLoadResult

    // Validate input against workflow's input schema (if defined)
    if (inputSchema) {
      const schemaValidationResult = validateAgainstSchema(rpcRequest.params.input, inputSchema)
      if (!schemaValidationResult.valid) {
        return NextResponse.json(createSchemaValidationError(requestId, schemaValidationResult), { status: 400 })
      }
    }

    // Transform MCP input to internal format
    const transformResult = transformInvokeInput(rpcRequest)
    if (!transformResult.success) {
      return NextResponse.json(formatErrorResponse(requestId, transformResult.error!), { status: 400 })
    }

    const transformed = transformResult.data!
    const invocationInput = createInvocationInput(transformed)

    // Create secret resolver for this user
    const secrets = createSecretResolver(principal.clerk_id)

    // Pre-fetch common provider keys for multi-provider workflows
    const apiKeys = await secrets.getAll(["OPENROUTER_API_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GROQ_API_KEY"])

    // Execute workflow within execution context
    const result = await withExecutionContext({ principal, secrets, apiKeys }, async () => {
      return invokeWorkflow(invocationInput)
    })

    const finishedAt = new Date().toISOString()

    if (!result.success) {
      return NextResponse.json(formatWorkflowError(requestId, result), { status: 500 })
    }

    const output = extractWorkflowOutput(result)
    const traceId = extractTraceId(result)

    // Return JSON-RPC success response
    return NextResponse.json(
      formatSuccessResponse(requestId, output, {
        requestId: transformed.workflowId,
        workflowId: transformed.workflowVersionId,
        startedAt,
        finishedAt,
        traceId,
      }),
      { status: 200 },
    )
  } catch (error) {
    console.error("MCP Invoke API Error:", error)
    return NextResponse.json(formatInternalError(requestId ?? null, error), {
      status: 500,
    })
  }
}
