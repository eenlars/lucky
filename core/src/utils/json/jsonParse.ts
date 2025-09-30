// Copied from @lucky/shared for standalone core
// npm install json5
import JSON5 from "json5"

/**
 * Try to pull a JSON/JSON5 object out of any AI-generated text.
 * @param input  only strings are allowed.
 * @returns      The first successfully parsed JSON object.
 * @throws       If no valid JSON or JSON5 could be extracted or if the result is an array.
 */
function extractJSON(input: unknown, throwIfError: boolean = false): Record<string, unknown> | string {
  // if it's already an object or array, return it directly
  if (typeof input === "object" && input !== null) {
    if (Array.isArray(input)) {
      return { data: input }
    }
    return input as Record<string, unknown>
  }

  if (typeof input !== "string") {
    if (throwIfError) {
      throw new TypeError(`extractJSON: expected a string or object but got ${typeof input}`)
    }
    return JSON.parse(JSON.stringify(input))
  }

  const cleaned = removeCodeFences(input).trim()
  const candidates = findJSONCandidates(cleaned)

  for (const chunk of candidates) {
    const candidate = chunk.trim()
    // Try JSON5 first, then strict JSON
    const tries = [() => JSON5.parse(candidate), () => JSON.parse(candidate)] as const

    for (const tryParse of tries) {
      try {
        let json = tryParse()

        // HOTFIX: unwrap a single-element array that contains one object
        if (
          Array.isArray(json) &&
          json.length === 1 &&
          typeof json[0] === "object" &&
          json[0] !== null &&
          !Array.isArray(json[0])
        ) {
          json = json[0]
        }

        // ── New logic ──────────────────────────────────────────────
        if (Array.isArray(json)) {
          // Accept arrays by wrapping them
          return { data: json }
        }

        if (typeof json === "object" && json !== null) {
          return json as Record<string, unknown>
        }

        // Anything else (string, number, null, boolean) → keep looking
      } catch {
        /* keep trying with the next parser or candidate */
      }
    }
  }

  if (throwIfError) {
    throw new Error("extractJSON: no valid JSON or JSON5 object/array found")
  }
  return JSON.parse(JSON.stringify(input))
}

/** Strip out ```…``` or ~~~…~~~ fences, but preserve their inner text. */
function removeCodeFences(text: string): string {
  return text.replace(/(```|~~~)[ \w]*\n?([\s\S]*?)\1/g, (_match, _fence, inner) => inner)
}

/**
 * Walk the string and collect every balanced {...} or [...] snippet.
 * Sorts them by descending length so the largest one is tried first.
 */
function findJSONCandidates(str: string): string[] {
  const results: string[] = []
  const len = str.length

  for (let i = 0; i < len; i++) {
    const open = str[i]
    if (open !== "{" && open !== "[") continue

    const close = open === "{" ? "}" : "]"
    let depth = 0

    for (let j = i; j < len; j++) {
      const ch = str[j]
      if (ch === open) depth++
      else if (ch === close) depth--

      if (depth === 0) {
        // found a balanced chunk!
        results.push(str.substring(i, j + 1))
        break
      }
    }
  }

  // try bigger blobs first
  return results.sort((a, b) => b.length - a.length)
}

export const isJSON = (str: unknown): boolean => {
  try {
    // if it's already an object or array, check if it's JSON-serializable
    if (typeof str === "object" && str !== null) {
      JSON.stringify(str)
      return true
    }

    // if it's a string, try to extract JSON from it
    if (typeof str === "string") {
      extractJSON(str)
      return true
    }

    return false
  } catch {
    return false
  }
}
export const show = (obj: unknown, indent: number = 2, depth: number = 0): string => {
  // prevent infinite recursion
  if (depth > 10) {
    return JSON.stringify(obj, null, indent)
  }

  // check if it's already json-like
  if (isJSON(obj)) {
    // if it's a string that contains json, extract and format it recursively
    if (typeof obj === "string") {
      try {
        const extracted = extractJSON(obj)
        // recursively process the extracted json in case it contains more stringified json
        return show(extracted, indent, depth + 1)
      } catch {
        // fallback to showing the string as-is if extraction fails
        return obj
      }
    }

    // if it's an object, check if any values need recursive processing
    if (typeof obj === "object" && obj !== null) {
      const processed: any = Array.isArray(obj) ? [] : {}

      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === "string" && isJSON(value)) {
          // recursively process stringified json values
          try {
            const extracted = extractJSON(value)
            processed[key] = JSON.parse(show(extracted, 0, depth + 1))
          } catch {
            processed[key] = value
          }
        } else {
          processed[key] = value
        }
      }

      return JSON.stringify(processed, null, indent)
    }

    // if it's an object, stringify it
    return JSON.stringify(obj, null, indent)
  }

  // if it's not json, stringify it
  return JSON.stringify(obj, null, indent)
}

export const JSONN = {
  extract: extractJSON,
  isJSON: isJSON,
  show: show,
}
