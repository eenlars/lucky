import type { InvokeRequest } from "@lucky/shared/contracts/invoke"

export interface ValidatedInvokeRequest {
  rpcRequest: InvokeRequest
  bearerToken: string
  idempotencyKey?: string
}

export interface InvocationMetadata {
  requestId: string
  workflowId: string
  startedAt: string
  finishedAt?: string
  traceId?: string
}

export interface TransformedInvokeInput {
  workflowVersionId: string
  prompt: string
  workflowId: string
}
