import { isVercelAIStructure, isZodSchema } from "../schemaDetection"
import { describe, expect, it } from "vitest"
import { z } from "zod"

describe("Schema Detection", () => {
  describe("isZodSchema", () => {
    it("should detect basic Zod object schemas", () => {
      const schema = z.object({
        query: z.string(),
        count: z.number(),
      })
      expect(isZodSchema(schema)).toBe(true)
    })

    it("should detect Zod schemas with complex chaining", () => {
      const schema = z.object({
        query: z.string().describe("Search query"),
        maxResultCount: z.number().max(20).default(10).optional(),
        tags: z.array(z.string()).optional(),
        type: z.enum(["basic", "advanced"]),
      })
      expect(isZodSchema(schema)).toBe(true)
    })

    it("should detect simple Zod primitives", () => {
      expect(isZodSchema(z.string())).toBe(true)
      expect(isZodSchema(z.number())).toBe(true)
      expect(isZodSchema(z.boolean())).toBe(true)
      expect(isZodSchema(z.array(z.string()))).toBe(true)
      expect(isZodSchema(z.enum(["a", "b", "c"]))).toBe(true)
    })

    it("should detect Zod union and optional schemas", () => {
      expect(isZodSchema(z.union([z.string(), z.number()]))).toBe(true)
      expect(isZodSchema(z.string().optional())).toBe(true)
      expect(isZodSchema(z.any())).toBe(true)
    })

    it("should handle null and undefined inputs", () => {
      expect(isZodSchema(null)).toBe(false)
      expect(isZodSchema(undefined)).toBe(false)
    })

    it("should reject plain objects", () => {
      expect(isZodSchema({})).toBe(false)
      expect(isZodSchema({ query: "string", count: "number" })).toBe(false)
      expect(isZodSchema({ typeName: "fake" })).toBe(false)
    })

    it("should reject primitive values", () => {
      expect(isZodSchema("string")).toBe(false)
      expect(isZodSchema(42)).toBe(false)
      expect(isZodSchema(true)).toBe(false)
      expect(isZodSchema([])).toBe(false)
    })

    it("should handle edge cases gracefully", () => {
      // Objects with potentially problematic properties
      expect(isZodSchema({ constructor: null })).toBe(false)
      expect(isZodSchema({ parse: "not a function" })).toBe(false)
      expect(isZodSchema({ safeParse: () => {} })).toBe(false) // missing parse
      
      // Objects that might throw on property access
      const problematicObject = Object.create(null)
      expect(isZodSchema(problematicObject)).toBe(false)
    })

    it("should detect schemas used in tool patterns", () => {
      // Pattern from commonSchemas in toolFactory
      const querySchema = z.string().describe("Search query or input text")
      const resultCountSchema = z.number().max(20).default(10).nullish()
      
      expect(isZodSchema(querySchema)).toBe(true)
      expect(isZodSchema(resultCountSchema)).toBe(true)
    })
  })

  describe("isVercelAIStructure", () => {
    it("should detect Vercel AI structure with jsonSchema", () => {
      const vercelStructure = {
        jsonSchema: { type: "object", properties: {} }
      }
      expect(isVercelAIStructure(vercelStructure)).toBe(true)
    })

    it("should reject objects without jsonSchema", () => {
      expect(isVercelAIStructure({})).toBe(false)
      expect(isVercelAIStructure({ schema: {} })).toBe(false)
      expect(isVercelAIStructure({ jsonSchema: undefined })).toBe(false)
    })

    it("should handle null and undefined", () => {
      expect(isVercelAIStructure(null)).toBe(false)
      expect(isVercelAIStructure(undefined)).toBe(false)
    })

    it("should accept any jsonSchema value", () => {
      expect(isVercelAIStructure({ jsonSchema: null })).toBe(true)
      expect(isVercelAIStructure({ jsonSchema: {} })).toBe(true)
      expect(isVercelAIStructure({ jsonSchema: "string" })).toBe(true)
    })
  })

  describe("Schema Detection Integration", () => {
    it("should properly differentiate between Zod and Vercel AI structures", () => {
      const zodSchema = z.object({ query: z.string() })
      const vercelStructure = { jsonSchema: { type: "object" } }
      
      expect(isZodSchema(zodSchema)).toBe(true)
      expect(isVercelAIStructure(zodSchema)).toBe(false)
      
      expect(isZodSchema(vercelStructure)).toBe(false)
      expect(isVercelAIStructure(vercelStructure)).toBe(true)
    })

    it("should handle tool parameter patterns correctly", () => {
      // Simulate the tool parameter processing flow
      const toolParameters = z.object({
        query: z.string().describe("Search query"),
        maxResultCount: z.number().max(20).default(10).describe("Number of results"),
      })

      // This simulates what happens in selectToolStrategy
      expect(isVercelAIStructure(toolParameters)).toBe(false)
      expect(isZodSchema(toolParameters)).toBe(true)
    })
  })
})