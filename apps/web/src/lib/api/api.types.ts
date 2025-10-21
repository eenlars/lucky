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

/**
 * Default path mapping: /api/<endpoint>
 * Override if any endpoint lives elsewhere.
 * For dynamic routes, use the pathParams to replace placeholders
 */
export const endpointPath = <E extends Endpoint>(endpoint: E) => {
  const endpointStr = String(endpoint)
  return endpointStr.startsWith("/") ? `/api${endpointStr}` : `/api/${endpointStr}`
}

export type Method = "GET" | "POST" | "PUT" | "DELETE"

export interface ApiInit<E extends Endpoint> extends Omit<RequestInit, "body" | "method"> {
  method?: Method
  body?: Req<E>
}

export type PathOverride = string | undefined // e.g. /api/call-status/123
