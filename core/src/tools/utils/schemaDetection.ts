import { isNir } from "@core/utils/common/isNir"

/**
 * Robust detection of Zod schemas across different versions and patterns.
 * Handles multiple detection strategies for reliability.
 */
export function isZodSchema(params: any): boolean {
  if (isNir(params) || typeof params !== "object") return false

  // Strategy 1: Internal _def structure (most common in current Zod versions)
  if (params._def?.typeName && typeof params._def.typeName === "string") {
    return params._def.typeName.startsWith("Zod")
  }

  // Strategy 2: Method-based detection (most reliable across versions)
  if (
    typeof params.parse === "function" &&
    typeof params.safeParse === "function"
  ) {
    return true
  }

  // Strategy 3: Constructor-based check (fallback)
  try {
    const constructorName = params.constructor?.name
    if (constructorName?.startsWith("Zod")) return true
  } catch {
    // Constructor access might fail in some environments
  }

  // Strategy 4: Additional Zod-specific methods and properties
  if (params._type && typeof params.optional === "function") return true

  // Strategy 5: Direct typeName property (only if it's a Zod typeName)
  if ("typeName" in params && typeof params.typeName === "string") {
    return params.typeName.startsWith("Zod")
  }

  return false
}

/**
 * Checks if parameters has Vercel AI structure with jsonSchema property
 */
export function isVercelAIStructure(
  params: any
): params is { jsonSchema: any } {
  return params?.jsonSchema !== undefined
}
