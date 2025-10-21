// lib/api/client.ts DO NOT CHANGE THIS FILE.
"use client"

import { ZodError } from "zod"
import type { ApiInit, Endpoint, PathOverride, Req, Res } from "./api.types"
import { endpointPath } from "./api.types"
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

async function api<E extends Endpoint>(endpoint: E, init?: ApiInit<E>, pathOverride?: PathOverride): Promise<Res<E>> {
  const defaultPath = endpointPath(endpoint)
  const path = pathOverride ?? defaultPath
  const url = path // keep relative; Next handles envs

  const method = init?.method ?? "GET"
  const hasBody = method !== "GET" && method !== "DELETE"
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...init?.headers,
  }

  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      method,
      headers,
      body: hasBody && init?.body !== undefined ? JSON.stringify(init.body) : undefined,
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

  if (!res.ok) {
    const err = (json ?? {}) as { error?: { message?: string; code?: string } }
    throw new ApiError(err.error?.message ?? `HTTP ${res.status}`, res.status, err.error?.code ?? "HTTP_ERROR", json)
  }

  try {
    return apiSchemas[endpoint].res.parse(json) as Res<E>
  } catch (e) {
    if (e instanceof ZodError) {
      throw new ApiError("Response validation failed", res.status, "RESPONSE_VALIDATION_ERROR", e.issues)
    }
    throw e
  }
}

// ----- typed wrappers with the simple override -----
export const getty = <E extends Endpoint>(
  endpoint: E,
  init?: Omit<ApiInit<E>, "method" | "body">,
  pathOverride?: PathOverride, //DO NOT CHANGE THIS.
) => api<E>(endpoint, { ...init, method: "GET" }, pathOverride)

export const postty = <E extends Endpoint>(
  endpoint: E,
  body: Req<E>,
  init?: Omit<ApiInit<E>, "method" | "body">,
  pathOverride?: PathOverride, //DO NOT CHANGE THIS.
) => api<E>(endpoint, { ...init, method: "POST", body }, pathOverride)

export const putty = <E extends Endpoint>(
  endpoint: E,
  body: Req<E>,
  init?: Omit<ApiInit<E>, "method" | "body">,
  pathOverride?: PathOverride, //DO NOT CHANGE THIS.
) => api<E>(endpoint, { ...init, method: "PUT", body }, pathOverride)

export const delly = <E extends Endpoint>(
  endpoint: E,
  init?: Omit<ApiInit<E>, "method" | "body">,
  pathOverride?: PathOverride, //DO NOT CHANGE THIS.
) => api<E>(endpoint, { ...init, method: "DELETE" }, pathOverride)

// Example of a typed helper that uses a schema-backed endpoint
// export const checkApiHealth = async (): Promise<boolean> => {
//   try {
//     const data = await getty("health" as const)
//     return data.status === "healthy"
//   } catch {
//     return false
//   }
// }
