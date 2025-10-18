import type { apiSchemas } from "@/lib/api/schemas"
import type { z } from "zod"

export type ApiSchemas = typeof apiSchemas
export type Endpoint = keyof ApiSchemas

export type Req<E extends Endpoint> = ApiSchemas[E] extends { req: infer R }
  ? R extends z.ZodTypeAny
    ? z.infer<R>
    : never
  : never

export type Res<E extends Endpoint> = ApiSchemas[E] extends { res: infer R }
  ? R extends z.ZodTypeAny
    ? z.infer<R>
    : never
  : never

export type Query<E extends Endpoint> = ApiSchemas[E] extends { query: infer Q }
  ? Q extends z.ZodTypeAny
    ? z.infer<Q>
    : never
  : never

/**
 * Default path mapping: /api/<endpoint>
 * Strips :method suffixes for type discrimination
 */
export const endpointPath = <E extends Endpoint>(endpoint: E) => {
  const path = String(endpoint)
  // Strip :method suffix (e.g., "user/profile:put" -> "user/profile")
  return `/api/${path.replace(/:(get|post|put|delete|patch)$/i, "")}`
}

export type Method = "GET" | "POST" | "PUT" | "DELETE"

/**
 * Options for API requests with body (POST, PUT, PATCH)
 */
export interface ApiOptionsWithBody<E extends Endpoint> {
  body: Req<E>
  url: string
  fetchOptions?: Omit<RequestInit, "body" | "method">
}

/**
 * Options for API requests without body (GET, DELETE)
 */
export interface ApiOptionsWithoutBody<E extends Endpoint = Endpoint> {
  url: string
  query?: Query<E>
  fetchOptions?: Omit<RequestInit, "body" | "method">
}
