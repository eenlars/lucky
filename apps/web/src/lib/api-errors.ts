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
