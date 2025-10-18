// lib/api/client.ts
"use client"

import { ZodError } from "zod"
import type { ApiOptionsWithBody, ApiOptionsWithoutBody, Endpoint, Req, Res } from "./api.types"
import { apiSchemas } from "./schemas"

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: unknown,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

/**
 * Build URL search params from typed query object
 */
function buildQueryString(query?: Record<string, unknown>): string {
  if (!query) return ""

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, String(v)))
      } else {
        params.append(key, String(value))
      }
    }
  }

  const queryString = params.toString()
  return queryString ? `?${queryString}` : ""
}

async function api<E extends Endpoint>(
  endpoint: E,
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  body?: Req<E>,
  fetchOptions?: Omit<RequestInit, "body" | "method">,
): Promise<Res<E>> {
  const hasBody = method !== "GET" && method !== "DELETE"
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...fetchOptions?.headers,
  }

  let res: Response
  try {
    res = await fetch(url, {
      ...fetchOptions,
      method,
      headers,
      body: hasBody && body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (e) {
    throw new ApiError("Network error while fetching", undefined, "NETWORK_ERROR", e)
  }

  let json: unknown
  try {
    json = await res.json()
  } catch {
    throw new ApiError("Non-JSON response from server", res.status, "NON_JSON_RESPONSE")
  }

  // Debug: Log response for troubleshooting
  if (process.env.NODE_ENV === "development") {
    console.log(`[API Client] ${method} ${url}`, { status: res.status, json })
  }

  // Validate response (both success and error responses)
  try {
    const validated = apiSchemas[endpoint].res.parse(json) as Res<E>

    // If validation passed but res.ok is false, throw the error from the response
    if (!res.ok) {
      const err = (json ?? {}) as { error?: { message?: string; code?: string } }
      throw new ApiError(err.error?.message ?? `HTTP ${res.status}`, res.status, err.error?.code ?? "HTTP_ERROR", json)
    }

    return validated
  } catch (e) {
    if (e instanceof ZodError) {
      throw new ApiError("Response validation failed", res.status, "RESPONSE_VALIDATION_ERROR", e.issues)
    }
    throw e
  }
}

/**
 * GET request - no body
 * @example
 * const data = await get("user/env-keys", {
 *   url: "/api/user/env-keys"
 * })
 *
 * @example with query params
 * const data = await get("workflow/invocations", {
 *   url: "/api/workflow/invocations",
 *   query: { status: "completed", page: 1, limit: 10 }
 * })
 */
export const get = <E extends Endpoint>(endpoint: E, options: ApiOptionsWithoutBody<E>): Promise<Res<E>> => {
  const url = options.url + buildQueryString(options.query as Record<string, unknown>)
  return api<E>(endpoint, "GET", url, undefined, options.fetchOptions)
}

/**
 * POST request - with body
 * @example
 * await post("user/env-keys/set", {
 *   body: { key: "API_KEY", value: "sk-..." },
 *   url: "/api/user/env-keys"
 * })
 */
export const post = <E extends Endpoint>(endpoint: E, options: ApiOptionsWithBody<E>): Promise<Res<E>> =>
  api<E>(endpoint, "POST", options.url, options.body, options.fetchOptions)

/**
 * PUT request - with body
 * @example
 * await put("user/profile:put", {
 *   body: { name: "John" },
 *   url: "/api/user/profile"
 * })
 */
export const put = <E extends Endpoint>(endpoint: E, options: ApiOptionsWithBody<E>): Promise<Res<E>> =>
  api<E>(endpoint, "PUT", options.url, options.body, options.fetchOptions)

/**
 * DELETE request - no body
 * @example
 * await del("user/env-keys", {
 *   url: "/api/user/env-keys",
 *   query: { name: "API_KEY" }
 * })
 */
export const del = <E extends Endpoint>(endpoint: E, options: ApiOptionsWithoutBody<E>): Promise<Res<E>> => {
  const url = options.url + buildQueryString(options.query as Record<string, unknown>)
  return api<E>(endpoint, "DELETE", url, undefined, options.fetchOptions)
}
