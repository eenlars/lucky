import { isNir } from "@core/utils/common/isNir"
import { z } from "zod"

/**
 * Centralized memory schema definitions to prevent inconsistencies
 *
 * IMPORTANT: All memory-related schemas should use these shared definitions
 * to prevent mismatches between what AI returns and what schemas expect.
 *
 * Problem Prevention:
 * - Use MemoryResponseSchema for AI responses that return memory directly
 * - Use MemorySchemaOptional for node configurations that can have memory
 * - Never create new memory schemas - always import from here
 * - This prevents issues where AI returns {"key": "value"} but schema expects {"memory": {"key": "value"}}
 */

// Base memory schema - a record of string keys to string values
export const MemorySchema = z.record(z.string(), z.string())

// Memory schema that can be null or undefined
export const MemorySchemaOptional = MemorySchema.nullish()

// For AI responses that should return memory directly (not wrapped in an object)
export const MemoryResponseSchema = MemorySchema

// For AI responses that need memory wrapped in an object (if needed)
export const MemoryResponseWrappedSchema = z.object({
  memory: MemorySchema,
})

// Type exports
export type NodeMemory = z.infer<typeof MemorySchema>
export type MemoryOptional = z.infer<typeof MemorySchemaOptional>
export type MemoryResponse = z.infer<typeof MemoryResponseSchema>
export type MemoryResponseWrapped = z.infer<typeof MemoryResponseWrappedSchema>

/**
 * Validation helper for memory objects
 */
export const validateMemory = (memory: unknown): NodeMemory | null => {
  const result = MemorySchema.safeParse(memory)
  return result.success ? result.data : null
}

/**
 * Validation helper for optional memory objects
 */
export const validateMemoryOptional = (memory: unknown): MemoryOptional => {
  const result = MemorySchemaOptional.safeParse(memory)
  return result.success ? result.data : null
}

/**
 * Alias for backward compatibility
 */
export const validateNodeMemory = validateMemory

/**
 * Sanitize memory by removing invalid entries
 */
export const sanitizeNodeMemory = (memory: unknown): Record<string, string> => {
  if (!memory || typeof memory !== "object" || Array.isArray(memory)) {
    return {}
  }

  const result: NodeMemory = {}
  for (const [key, value] of Object.entries(memory)) {
    if (typeof key === "string" && typeof value === "string") {
      result[key] = value
    }
  }

  return result
}

export const getMemoryExplanation = (memory: NodeMemory): string => {
  if (isNir(memory)) return ""
  return `
  the memory works as follows: 
  current_memory: ${JSON.stringify(memory, null, 2)}
  `
}
