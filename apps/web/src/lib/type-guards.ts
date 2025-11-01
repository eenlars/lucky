// type guards for common patterns in the codebase

export function isError(value: unknown): value is Error {
  return value instanceof Error
}

export function isAbortError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false
  return "name" in error && (error as Error).name === "AbortError"
}

export function hasProperty<K extends string>(obj: unknown, key: K): obj is Record<K, unknown> {
  return typeof obj === "object" && obj !== null && key in obj
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function isStringRecord(value: unknown): value is Record<string, string> {
  if (!isRecord(value)) return false
  return Object.values(value).every(v => typeof v === "string")
}

export function hasStringProperty<K extends string>(obj: unknown, key: K): obj is Record<K, string> {
  return hasProperty(obj, key) && typeof (obj as Record<K, unknown>)[key] === "string"
}

export function hasNumberProperty<K extends string>(obj: unknown, key: K): obj is Record<K, number> {
  return hasProperty(obj, key) && typeof (obj as Record<K, unknown>)[key] === "number"
}

// database record type guards
export function isDatasetRecord(record: unknown): record is {
  dataset_record_id: string
  workflow_input: unknown
  ground_truth: unknown
} {
  return (
    isRecord(record) &&
    hasProperty(record, "dataset_record_id") &&
    hasProperty(record, "workflow_input") &&
    hasProperty(record, "ground_truth") &&
    record.workflow_input !== null &&
    record.workflow_input !== undefined &&
    record.ground_truth !== null &&
    record.ground_truth !== undefined
  )
}

// graph/visualization type guards
export function hasStatsProperty(obj: unknown): obj is {
  stats: {
    totalInvocations?: number
    successfulInvocations?: number
    maxAccuracy?: number
    totalCost?: number
    totalDuration?: number
    peakFitnessScore?: number
  }
} {
  return isRecord(obj) && hasProperty(obj, "stats") && isRecord(obj.stats)
}

export function hasTargetNode(obj: unknown): obj is { targetNode: unknown } {
  return isRecord(obj) && hasProperty(obj, "targetNode")
}

export function hasEvolutionRun(obj: unknown): obj is { evolutionRun: { goalText?: string } } {
  return isRecord(obj) && hasProperty(obj, "evolutionRun") && isRecord(obj.evolutionRun)
}

// payload type guards
export function isAggregatedPayload(payload: unknown): payload is {
  kind: "aggregated"
  messages: Array<{ payload: unknown; fromNodeId: string }>
} {
  return (
    isRecord(payload) &&
    hasStringProperty(payload, "kind") &&
    payload.kind === "aggregated" &&
    hasProperty(payload, "messages") &&
    Array.isArray(payload.messages)
  )
}

export function isSequentialPayload(payload: unknown): payload is { kind: "sequential" } {
  return isRecord(payload) && hasStringProperty(payload, "kind") && payload.kind === "sequential"
}
