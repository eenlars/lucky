import Ajv from "ajv"
import addFormats from "ajv-formats"
import draft7Meta from "ajv/dist/refs/json-schema-draft-07.json"
import type { JSONSchema7 } from "json-schema"
import { z } from "zod"

// Separate AJV instances to handle Draft 7 vs 2020-12 semantic differences
const ajvDraft7 = new Ajv({ allErrors: true, strict: false })
addFormats(ajvDraft7)
// Only add meta schema if not already present to avoid duplicate schema errors
try {
  ajvDraft7.addMetaSchema(draft7Meta)
} catch (_e) {
  // Meta schema already exists, ignore
}

const ajv2020 = new Ajv({ allErrors: true, strict: false })
addFormats(ajv2020)

/**
 * Schema version detection via $schema URI heuristic.
 * Fallback to Draft 7 maintains backward compatibility.
 */
function validateJsonSchema(val: unknown) {
  // Boolean schemas (true/false) are valid in both draft-07 and 2020-12
  if (typeof val === "boolean") {
    return { ok: true }
  }

  if (typeof val !== "object" || val === null) {
    return {
      ok: false,
      errors: "Schema must be a non-null object.\nBoolean schemas (true/false) are allowed.",
    }
  }

  const obj = val as Record<string, unknown>
  const $schema = typeof obj.$schema === "string" ? obj.$schema : undefined

  // URI pattern matching for version detection
  const ajv = $schema?.includes("2020") ? ajv2020 : ajvDraft7

  // Meta-schema validation against JSON Schema spec
  try {
    const ok = ajv.validateSchema(obj)
    return ok ? { ok: true } : { ok: false, errors: ajv.errorsText(ajv.errors, { separator: "\n" }) }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    return { ok: false, errors: errorMessage }
  }
}

/**
 * Zod-AJV bridge for JSON Schema validation.
 * superRefine + transform pattern ensures type safety post-validation.
 */
export const JsonSchemaZ = z
  .unknown()
  .superRefine((val, ctx) => {
    const { ok, errors } = validateJsonSchema(val)
    if (!ok) ctx.addIssue({ code: "custom", message: `Invalid JSON Schema:\n${errors}` })
  })
  .transform(v => v as JSONSchema7)
