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

export function isNodeChange(change: unknown): change is { type: string; id: string } {
  return isRecord(change) && hasStringProperty(change, "type") && hasStringProperty(change, "id")
}

export function hasCryptoRandomUUID(crypto: unknown): crypto is { randomUUID: () => string } {
  return (
    typeof crypto === "object" &&
    crypto !== null &&
    "randomUUID" in crypto &&
    typeof (crypto as Record<string, unknown>).randomUUID === "function"
  )
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

// migration-specific type guards
export function hasScoreAndAccuracy(data: unknown): data is { data: { score: number; accuracy: number } } {
  return (
    isRecord(data) &&
    hasProperty(data, "data") &&
    isRecord(data.data) &&
    hasNumberProperty(data.data, "score") &&
    hasNumberProperty(data.data, "accuracy")
  )
}

export function hasScoreAndDataAccuracy(data: unknown): data is { data: { score: number; dataAccuracy: number } } {
  return (
    isRecord(data) &&
    hasProperty(data, "data") &&
    isRecord(data.data) &&
    hasNumberProperty(data.data, "score") &&
    hasNumberProperty(data.data, "dataAccuracy")
  )
}

export function hasScore(data: unknown): data is { score: number } {
  return isRecord(data) && hasNumberProperty(data, "score")
}

// agent step type guards
export function hasReturnProperty(step: unknown): step is { return: unknown } {
  return isRecord(step) && hasProperty(step, "return")
}

export function hasNameProperty(step: unknown): step is { name: string } {
  return isRecord(step) && hasStringProperty(step, "name")
}

export function hasResultProperty(response: unknown): response is { result: unknown } {
  return isRecord(response) && hasProperty(response, "result")
}

// json parsing type guards
export function isJsonString(value: unknown): value is string {
  if (typeof value !== "string") return false
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

export function isArrayOfRecords(value: unknown): value is Array<Record<string, unknown>> {
  return Array.isArray(value) && value.every(item => isRecord(item))
}
