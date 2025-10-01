import { describe, expect, it } from "vitest"
import {
  MemoryResponseSchema,
  MemorySchema,
  MemorySchemaOptional,
  sanitizeNodeMemory,
  validateMemory,
} from "../../../utils/memory/memorySchema"

describe("Memory Schema", () => {
  // TODO: this test suite is well-structured and tests schema validation properly.
  // however, it could benefit from more edge cases like testing deeply nested
  // objects, very long strings, special characters in keys, or memory objects
  // with hundreds of keys to ensure performance at scale.
  describe("MemorySchema", () => {
    it("should validate valid memory objects", () => {
      const valid = {
        physical_stores: "common_sense:some companies have physical store locations:1",
        user_preference: "tool_usage:user prefers concise answers:3",
      }

      const result = MemorySchema.safeParse(valid)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(valid)
    })

    it("should reject invalid memory objects", () => {
      const invalid = {
        key: 123, // not a string
        another: "valid",
      }

      const result = MemorySchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe("MemorySchemaOptional", () => {
    it("should accept null/undefined", () => {
      expect(MemorySchemaOptional.safeParse(null).success).toBe(true)
      expect(MemorySchemaOptional.safeParse(undefined).success).toBe(true)
    })

    it("should accept valid memory objects", () => {
      const valid = { key: "value" }
      expect(MemorySchemaOptional.safeParse(valid).success).toBe(true)
    })
  })

  describe("MemoryResponseSchema", () => {
    it("should be the same as MemorySchema", () => {
      // TODO: this test only verifies that two schemas parse the same way for one
      // simple case. should test with more complex data structures to ensure the
      // schemas truly remain equivalent across all cases.
      const data = { key: "value" }

      const memoryResult = MemorySchema.safeParse(data)
      const responseResult = MemoryResponseSchema.safeParse(data)

      expect(memoryResult.success).toBe(responseResult.success)
      expect(memoryResult.data).toEqual(responseResult.data)
    })
  })

  describe("validateMemory", () => {
    it("should return valid memory", () => {
      const valid = { key: "value" }
      expect(validateMemory(valid)).toEqual(valid)
    })

    it("should return null for invalid memory", () => {
      expect(validateMemory("not an object")).toBeNull()
      expect(validateMemory(123)).toBeNull()
      expect(validateMemory([])).toBeNull()
    })
  })

  describe("sanitizeNodeMemory", () => {
    it("should remove invalid entries", () => {
      const input = {
        valid: "string",
        invalid: 123,
        also_valid: "another string",
      }

      const result = sanitizeNodeMemory(input)
      expect(result).toEqual({
        valid: "string",
        also_valid: "another string",
      })
    })

    it("should handle invalid inputs", () => {
      expect(sanitizeNodeMemory(null)).toEqual({})
      expect(sanitizeNodeMemory([])).toEqual({})
      expect(sanitizeNodeMemory("string")).toEqual({})
    })
  })
})
