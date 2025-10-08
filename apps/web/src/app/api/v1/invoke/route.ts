import { requireAuth } from "@/lib/api-auth"
import {
  createInvocationInput,
  extractTraceId,
  extractWorkflowOutput,
  formatErrorResponse,
  formatInternalError,
  formatSuccessResponse,
  formatWorkflowError,
  transformInvokeInput,
  validateAuth,
  validateInvokeRequest,
} from "@/lib/mcp-invoke"
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

    // Extract and validate bearer token
    const headers = Object.fromEntries(req.headers.entries())
    const authResult = validateAuth(headers, rpcRequest)
    if (!authResult.success) {
      return NextResponse.json(formatErrorResponse(requestId, authResult.error!), { status: 401 })
    }

    // TODO: Use bearerToken and idempotencyKey for validation
    // const { bearerToken, idempotencyKey } = authResult

    // Require user authentication (Next.js session)
    const nextAuthResult = await requireAuth()
    if (nextAuthResult instanceof NextResponse) {
      return NextResponse.json(
        formatErrorResponse(requestId, {
          code: -32000, // INVALID_AUTH
          message: "Authentication required",
        }),
        { status: 401 },
      )
    }

    // TODO: Validate bearer token against workflow permissions
    // await validateBearerToken(bearerToken!, rpcRequest.params.workflow_id)

    // TODO: Check idempotency key for duplicate requests
    // if (idempotencyKey) {
    //   const cached = await checkIdempotencyCache(idempotencyKey)
    //   if (cached) return cached response
    // }

    // Transform MCP input to internal format
    const transformResult = transformInvokeInput(rpcRequest)
    if (!transformResult.success) {
      return NextResponse.json(formatErrorResponse(requestId, transformResult.error!), { status: 400 })
    }

    const transformed = transformResult.data!
    const invocationInput = createInvocationInput(transformed)

    // Call internal workflow invocation API
    const invokeResponse = await fetch(`http://localhost:${process.env.PORT || 3000}/api/workflow/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") ?? "",
      },
      body: JSON.stringify(invocationInput),
    })

    const finishedAt = new Date().toISOString()

    if (!invokeResponse.ok) {
      const errorData = await invokeResponse.json()
      return NextResponse.json(formatWorkflowError(requestId, errorData), { status: 500 })
    }

    const result = await invokeResponse.json()
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
    return NextResponse.json(formatInternalError(requestId ?? null, error), { status: 500 })
  }
}
