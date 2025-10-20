import type { CredentialError } from "@lucky/core/utils/config/credential-errors"
import { NextResponse } from "next/server"

/**
 * Standard API error response format.
 */
export interface ApiErrorResponse {
  error: string
  code?: string
  credential?: string
  message?: string
  docsUrl?: string
  details?: any
}

/**
 * Create a standardized error response for credential-related issues.
 */
export function credentialErrorResponse(error: CredentialError, status = 503): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: "Feature unavailable",
      code: error.details.code,
      credential: error.details.credential,
      message: error.details.userMessage,
      docsUrl: error.details.setupUrl,
    },
    { status },
  )
}

/**
 * Create a standardized error response for general errors.
 */
export function errorResponse(message: string, status = 500, details?: any): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      details,
    },
    { status },
  )
}

/**
 * Create a standardized validation error response.
 */
export function validationErrorResponse(message: string, details?: any): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: "Validation error",
      code: "VALIDATION_ERROR",
      message,
      details,
    },
    { status: 400 },
  )
}

/**
 * Create a standardized not found error response.
 */
export function notFoundErrorResponse(resource: string, id?: string): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: `${resource} not found`,
      code: "NOT_FOUND",
      message: id ? `${resource} with ID "${id}" not found` : `${resource} not found`,
    },
    { status: 404 },
  )
}

/**
 * Check if error is a credential error and return appropriate response.
 */
export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  if (error && typeof error === "object" && "details" in error && "credential" in (error as any).details) {
    return credentialErrorResponse(error as CredentialError)
  }

  if (error instanceof Error) {
    return errorResponse(error.message, 500, {
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }

  return errorResponse("An unexpected error occurred", 500)
}
