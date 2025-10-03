/**
 * Field mapping utility for converting between camelCase and snake_case.
 * Handles bidirectional conversion for database operations.
 */

/**
 * Convert camelCase to snake_case
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

/**
 * Convert snake_case to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Deep convert object keys from camelCase to snake_case
 */
export function toSnakeCaseObject<T = any>(obj: any): T {
  if (obj === null || obj === undefined) return obj

  if (Array.isArray(obj)) {
    return obj.map(item => toSnakeCaseObject(item)) as any
  }

  if (typeof obj !== "object") return obj

  // preserve Date instances
  if (obj instanceof Date) return obj as any

  const converted: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = toSnakeCase(key)
    converted[snakeKey] = toSnakeCaseObject(value)
  }
  return converted
}

/**
 * Deep convert object keys from snake_case to camelCase
 */
export function toCamelCaseObject<T = any>(obj: any): T {
  if (obj === null || obj === undefined) return obj

  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCaseObject(item)) as any
  }

  if (typeof obj !== "object") return obj

  // preserve Date instances
  if (obj instanceof Date) return obj as any

  const converted: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key)
    converted[camelKey] = toCamelCaseObject(value)
  }
  return converted
}

/**
 * Field mapping for common workflow fields
 */
export const FIELD_MAPPINGS = {
  // Workflow fields
  workflowVersionId: "wf_version_id",
  workflowId: "workflow_id",
  workflowInvocationId: "wf_invocation_id",

  // Evolution fields
  runId: "run_id",
  generationId: "generation_id",
  generationNumber: "generation_number",
  evolutionType: "evolution_type",

  // Node fields
  nodeId: "node_id",
  nodeVersionId: "node_version_id",
  nodeInvocationId: "node_invocation_id",

  // Message fields
  messageId: "msg_id",
  fromNodeId: "from_node_id",
  toNodeId: "to_node_id",
  originInvocationId: "origin_invocation_id",

  // Time fields
  startTime: "start_time",
  endTime: "end_time",
  createdAt: "created_at",
  updatedAt: "updated_at",

  // Other common fields
  usdCost: "usd_cost",
  fitnessScore: "fitness_score",
  commitMessage: "commit_message",
  systemPrompt: "system_prompt",
  goalText: "goal_text",
  bestWorkflowVersionId: "best_workflow_version_id",

  // Special handling for some fields
  parent1Id: "parent1_id",
  parent2Id: "parent2_id",
} as const

/**
 * Apply field mappings to an object (camelCase to snake_case).
 * Skip undefined/null values to avoid setting them in DB payloads.
 */
export function applyFieldMappings<T = any>(obj: any): T {
  if (!obj || typeof obj !== "object") return obj

  // preserve Date instances
  if (obj instanceof Date) return obj as any

  const mapped: any = {}

  for (const [key, value] of Object.entries(obj)) {
    // skip undefined values
    if (value === undefined) continue

    // Check if we have a specific mapping
    const mappedKey = (FIELD_MAPPINGS as any)[key] || toSnakeCase(key)

    // Recursively map nested objects
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      mapped[mappedKey] = applyFieldMappings(value)
    } else if (Array.isArray(value)) {
      mapped[mappedKey] = value.map(item => (typeof item === "object" ? applyFieldMappings(item) : item))
    } else {
      mapped[mappedKey] = value
    }
  }

  return mapped
}

/**
 * Reverse field mappings (snake_case to camelCase)
 */
export function reverseFieldMappings<T = any>(obj: any): T {
  if (!obj || typeof obj !== "object") return obj

  // Create reverse mapping
  const reverseMap: Record<string, string> = {}
  for (const [camel, snake] of Object.entries(FIELD_MAPPINGS)) {
    reverseMap[snake] = camel
  }

  const mapped: any = {}

  for (const [key, value] of Object.entries(obj)) {
    // Check if we have a specific reverse mapping
    const mappedKey = reverseMap[key] || toCamelCase(key)

    // Recursively map nested objects (skip Date objects to preserve timestamps)
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      mapped[mappedKey] = reverseFieldMappings(value)
    } else if (Array.isArray(value)) {
      mapped[mappedKey] = value.map(item => (typeof item === "object" ? reverseFieldMappings(item) : item))
    } else {
      mapped[mappedKey] = value
    }
  }

  return mapped
}
