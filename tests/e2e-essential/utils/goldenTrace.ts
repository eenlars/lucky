import crypto from "node:crypto"

export type CanonicalizeOptions = {
  // keys whose values should be removed or normalized
  redactKeys?: string[]
}

/**
 * Normalize a trace object by removing volatile fields like timestamps and ids,
 * then return a stable sha256 hash for snapshot comparison.
 */
export function hashGoldenTrace(
  input: unknown,
  options: CanonicalizeOptions = {}
): string {
  const normalized = normalizeDeep(input, options)
  const serialized = canonicalStringify(normalized)
  const hash = crypto.createHash("sha256").update(serialized).digest("hex")
  return hash
}

function normalizeDeep(value: unknown, options: CanonicalizeOptions): unknown {
  const redact = new Set([
    "timestamp",
    "time",
    "createdAt",
    "updatedAt",
    "id",
    "_id",
    ...(options.redactKeys ?? []),
  ])

  if (Array.isArray(value)) {
    return value.map((v) => normalizeDeep(v, options))
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !redact.has(key))
      .map(([key, val]) => [key, normalizeDeep(val, options)] as const)

    // sort keys for determinism
    entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return Object.fromEntries(entries)
  }
  if (typeof value === "number") {
    // clamp high-resolution times if any leak through
    if (!Number.isFinite(value)) return 0
    return Math.round(value * 1e6) / 1e6 // normalize floating precision
  }
  return value ?? null
}

function canonicalStringify(value: unknown): string {
  return JSON.stringify(value)
}
