import { describe, expect, it } from "vitest"
import { z } from "zod"
import { JsonSchemaZ } from "../utils/validateJsonSchema"

describe("JsonSchemaZ - JSON Schema Validation", () => {
  describe("Valid JSON Schemas", () => {
    it("should validate a simple string type schema", () => {
      const schema = { type: "string" }
      expect(() => JsonSchemaZ.parse(schema)).not.toThrow()
    })

    it("should validate a simple object type schema", () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
      }
      expect(() => JsonSchemaZ.parse(schema)).not.toThrow()
    })

    it("should validate an array type schema with items", () => {
      const schema = {
        type: "array",
        items: { type: "string" },
      }
      expect(() => JsonSchemaZ.parse(schema)).not.toThrow()
    })

    it("should validate a complex nested schema", () => {
      const schema = {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              name: { type: "string", minLength: 1 },
              email: { type: "string", format: "email" },
              age: { type: "integer", minimum: 0 },
            },
            required: ["name", "email"],
          },
          tags: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
          },
        },
        required: ["user"],
      }
      expect(() => JsonSchemaZ.parse(schema)).not.toThrow()
    })

    it("should validate an empty object as valid schema", () => {
      const schema = {}
      expect(() => JsonSchemaZ.parse(schema)).not.toThrow()
    })

    it("should validate schema with Draft 7 $schema URI", () => {
      const schema = {
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "string",
      }
      expect(() => JsonSchemaZ.parse(schema)).not.toThrow()
    })

    it("should detect 2020-12 $schema but reject without meta schema", () => {
      const schema = {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "string",
      }
      // Note: 2020-12 schema is detected, but AJV needs the meta schema registered
      const result = JsonSchemaZ.safeParse(schema)
      expect(result.success).toBe(false)
    })

    it("should validate schema with enum", () => {
      const schema = {
        type: "string",
        enum: ["red", "green", "blue"],
      }
      expect(() => JsonSchemaZ.parse(schema)).not.toThrow()
    })

    it("should validate schema with const", () => {
      const schema = {
        const: "fixed-value",
      }
      expect(() => JsonSchemaZ.parse(schema)).not.toThrow()
    })

    it("should validate schema with allOf", () => {
      const schema = {
        allOf: [{ type: "object" }, { properties: { name: { type: "string" } } }],
      }
      expect(() => JsonSchemaZ.parse(schema)).not.toThrow()
    })

    it("should validate schema with anyOf", () => {
      const schema = {
        anyOf: [{ type: "string" }, { type: "number" }],
      }
      expect(() => JsonSchemaZ.parse(schema)).not.toThrow()
    })

    it("should validate schema with oneOf", () => {
      const schema = {
        oneOf: [
          { type: "string", minLength: 5 },
          { type: "number", minimum: 10 },
        ],
      }
      expect(() => JsonSchemaZ.parse(schema)).not.toThrow()
    })

    it("should validate schema with not", () => {
      const schema = {
        not: { type: "null" },
      }
      expect(() => JsonSchemaZ.parse(schema)).not.toThrow()
    })

    it("should validate schema with $ref", () => {
      const schema = {
        $defs: {
          positiveInteger: {
            type: "integer",
            minimum: 1,
          },
        },
        type: "object",
        properties: {
          count: { $ref: "#/$defs/positiveInteger" },
        },
      }
      expect(() => JsonSchemaZ.parse(schema)).not.toThrow()
    })

    it("should validate schema with format validators", () => {
      const schema = {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          date: { type: "string", format: "date" },
          time: { type: "string", format: "time" },
          uri: { type: "string", format: "uri" },
          uuid: { type: "string", format: "uuid" },
        },
      }
      expect(() => JsonSchemaZ.parse(schema)).not.toThrow()
    })

    it("should validate schema with pattern", () => {
      const schema = {
        type: "string",
        pattern: "^[a-z]+$",
      }
      expect(() => JsonSchemaZ.parse(schema)).not.toThrow()
    })

    it("should validate schema with additionalProperties", () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string" },
        },
        additionalProperties: false,
      }
      expect(() => JsonSchemaZ.parse(schema)).not.toThrow()
    })

    it("should validate schema with patternProperties", () => {
      const schema = {
        type: "object",
        patternProperties: {
          "^[a-z]+$": { type: "string" },
        },
      }
      expect(() => JsonSchemaZ.parse(schema)).not.toThrow()
    })

    it("should validate schema with dependencies", () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string" },
          creditCard: { type: "number" },
        },
        dependencies: {
          creditCard: ["billingAddress"],
        },
      }
      expect(() => JsonSchemaZ.parse(schema)).not.toThrow()
    })

    it("should validate schema with conditional if/then/else", () => {
      const schema = {
        type: "object",
        properties: {
          country: { type: "string" },
        },
        if: {
          properties: { country: { const: "US" } },
        },
        // biome-ignore lint/suspicious/noThenProperty: `then` is a valid JSON Schema keyword for conditionals
        then: {
          properties: { postalCode: { pattern: "^[0-9]{5}(-[0-9]{4})?$" } },
        },
        else: {
          properties: { postalCode: { pattern: "^[A-Z0-9]+$" } },
        },
      }
      expect(() => JsonSchemaZ.parse(schema)).not.toThrow()
    })

    // Note: The current implementation requires schemas to be objects,
    // so boolean schemas (true/false) are not supported
  })

  describe("Invalid Non-Object Inputs", () => {
    it("should reject null", () => {
      const result = JsonSchemaZ.safeParse(null)
      expect(result.success).toBe(false)
      if (!result.success) {
        const errorMessage = result.error.toString()
        expect(errorMessage).toContain("Schema must be a non-null object")
      }
    })

    it("should reject string", () => {
      const result = JsonSchemaZ.safeParse("not a schema")
      expect(result.success).toBe(false)
      if (!result.success) {
        const errorMessage = result.error.toString()
        expect(errorMessage).toContain("Schema must be a non-null object")
      }
    })

    it("should reject number", () => {
      const result = JsonSchemaZ.safeParse(42)
      expect(result.success).toBe(false)
      if (!result.success) {
        const errorMessage = result.error.toString()
        expect(errorMessage).toContain("Schema must be a non-null object")
      }
    })

    it("should reject undefined", () => {
      const result = JsonSchemaZ.safeParse(undefined)
      expect(result.success).toBe(false)
      if (!result.success) {
        const errorMessage = result.error.toString()
        expect(errorMessage).toContain("Schema must be a non-null object")
      }
    })

    it("should reject array", () => {
      const result = JsonSchemaZ.safeParse([{ type: "string" }])
      expect(result.success).toBe(false)
      if (!result.success) {
        const errorMessage = result.error.toString()
        // Arrays are technically valid in JSON Schema spec, but not supported by this implementation
        expect(errorMessage).toContain("Invalid JSON Schema")
      }
    })
  })

  describe("Invalid JSON Schemas", () => {
    it("should reject schema with invalid type value", () => {
      const schema = { type: "invalid-type" }
      const result = JsonSchemaZ.safeParse(schema)
      expect(result.success).toBe(false)
      if (!result.success) {
        const errorMessage = result.error.toString()
        expect(errorMessage).toContain("Invalid JSON Schema")
      }
    })

    it("should reject schema with invalid properties structure", () => {
      const schema = {
        type: "object",
        properties: "should-be-object",
      }
      const result = JsonSchemaZ.safeParse(schema)
      expect(result.success).toBe(false)
    })

    it("should reject schema with invalid items structure", () => {
      const schema = {
        type: "array",
        items: "should-be-object-or-array",
      }
      const result = JsonSchemaZ.safeParse(schema)
      expect(result.success).toBe(false)
    })

    it("should reject schema with invalid minimum value", () => {
      const schema = {
        type: "number",
        minimum: "not-a-number",
      }
      const result = JsonSchemaZ.safeParse(schema)
      expect(result.success).toBe(false)
    })

    it("should reject schema with invalid required value", () => {
      const schema = {
        type: "object",
        required: "should-be-array",
      }
      const result = JsonSchemaZ.safeParse(schema)
      expect(result.success).toBe(false)
    })

    it("should reject schema with invalid enum value", () => {
      const schema = {
        type: "string",
        enum: "should-be-array",
      }
      const result = JsonSchemaZ.safeParse(schema)
      expect(result.success).toBe(false)
    })

    it("should reject schema with invalid pattern value", () => {
      const schema = {
        type: "string",
        pattern: 123,
      }
      const result = JsonSchemaZ.safeParse(schema)
      expect(result.success).toBe(false)
    })

    it("should reject schema with invalid maxLength value", () => {
      const schema = {
        type: "string",
        maxLength: -1,
      }
      const result = JsonSchemaZ.safeParse(schema)
      expect(result.success).toBe(false)
    })

    it("should reject schema with invalid additionalProperties value", () => {
      const schema = {
        type: "object",
        additionalProperties: "invalid",
      }
      const result = JsonSchemaZ.safeParse(schema)
      expect(result.success).toBe(false)
    })

    it("should reject schema with malformed $ref", () => {
      const schema = {
        type: "object",
        properties: {
          count: { $ref: 123 },
        },
      }
      const result = JsonSchemaZ.safeParse(schema)
      expect(result.success).toBe(false)
    })
  })

  describe("Schema Version Detection", () => {
    it("should use Draft 7 validator when $schema is missing", () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string" },
        },
      }
      expect(() => JsonSchemaZ.parse(schema)).not.toThrow()
    })

    it("should use Draft 7 validator for explicit Draft 7 $schema", () => {
      const schema = {
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "string",
      }
      expect(() => JsonSchemaZ.parse(schema)).not.toThrow()
    })

    it("should reject 2020-12 $schema without meta schema", () => {
      const schema = {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "string",
      }
      const result = JsonSchemaZ.safeParse(schema)
      expect(result.success).toBe(false)
    })

    it("should validate $schema with standard http Draft 7 protocol", () => {
      const schema = {
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "number",
      }
      expect(() => JsonSchemaZ.parse(schema)).not.toThrow()
    })

    it("should reject $schema with https protocol if not registered", () => {
      const schema = {
        $schema: "https://json-schema.org/draft-07/schema#",
        type: "boolean",
      }
      // https variant might not be registered in meta schema
      const result = JsonSchemaZ.safeParse(schema)
      // We expect this to fail since the https variant isn't in the meta schema
      expect(result.success).toBe(false)
    })

    it("should reject unknown $schema URIs", () => {
      const schema = {
        $schema: "http://example.com/unknown-schema",
        type: "string",
      }
      const result = JsonSchemaZ.safeParse(schema)
      expect(result.success).toBe(false)
    })

    it("should reject non-string $schema values", () => {
      const schema = {
        $schema: 123,
        type: "string",
      }
      const result = JsonSchemaZ.safeParse(schema)
      expect(result.success).toBe(false)
    })

    it("should reject schemas with unknown 2020 variant $schema", () => {
      const schema = {
        $schema: "https://example.com/schema-2020-edition",
        type: "string",
      }
      const result = JsonSchemaZ.safeParse(schema)
      expect(result.success).toBe(false)
    })
  })

  describe("Type Transformation", () => {
    it("should transform valid schema to JSONSchema7 type", () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string" },
        },
      }
      const result = JsonSchemaZ.parse(schema)
      expect(result).toEqual(schema)
    })

    it("should preserve all schema properties after transformation", () => {
      const schema = {
        $id: "https://example.com/person.schema.json",
        $schema: "http://json-schema.org/draft-07/schema#",
        title: "Person",
        type: "object",
        properties: {
          firstName: {
            type: "string",
            description: "The person's first name.",
          },
          lastName: {
            type: "string",
            description: "The person's last name.",
          },
          age: {
            description: "Age in years which must be equal to or greater than zero.",
            type: "integer",
            minimum: 0,
          },
        },
      }
      const result = JsonSchemaZ.parse(schema)
      expect(result).toEqual(schema)
      expect(result.title).toBe("Person")
      expect(result.$id).toBe("https://example.com/person.schema.json")
    })
  })

  describe("Error Messages", () => {
    it("should provide clear error message for invalid type", () => {
      const schema = { type: "notAValidType" }
      const result = JsonSchemaZ.safeParse(schema)
      expect(result.success).toBe(false)
      if (!result.success) {
        const errorMessage = result.error.toString()
        expect(errorMessage).toContain("Invalid JSON Schema")
        expect(errorMessage).toMatch(/type|schema/i)
      }
    })

    it("should provide error details for multiple validation failures", () => {
      const schema = {
        type: "object",
        properties: "invalid",
        items: "also-invalid",
      }
      const result = JsonSchemaZ.safeParse(schema)
      expect(result.success).toBe(false)
      if (!result.success) {
        const errorMessage = result.error.toString()
        expect(errorMessage).toContain("Invalid JSON Schema")
      }
    })
  })

  describe("Integration with Zod", () => {
    it("should work with Zod parse method", () => {
      const schema = { type: "string" }
      const result = JsonSchemaZ.parse(schema)
      expect(result).toBeDefined()
    })

    it("should work with Zod safeParse method", () => {
      const schema = { type: "string" }
      const result = JsonSchemaZ.safeParse(schema)
      expect(result.success).toBe(true)
    })

    it("should throw ZodError on invalid schema with parse", () => {
      const schema = { type: "invalid" }
      expect(() => JsonSchemaZ.parse(schema)).toThrow()
    })

    it("should return error object with safeParse", () => {
      const schema = null
      const result = JsonSchemaZ.safeParse(schema)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeDefined()
        expect(result.error.toString()).toContain("Schema must be a non-null object")
      }
    })

    it("should work in composed Zod schemas", () => {
      const ToolDefinitionSchema = JsonSchemaZ.and(
        z.object({
          name: z.string(),
        }),
      )

      const validInput = {
        type: "object",
        properties: { value: { type: "number" } },
        name: "myTool",
      }

      expect(() => ToolDefinitionSchema.parse(validInput)).not.toThrow()
    })
  })

  describe("Edge Cases", () => {
    it("should validate schema with circular reference structure", () => {
      const schema = {
        $defs: {
          node: {
            type: "object",
            properties: {
              value: { type: "number" },
              next: { $ref: "#/$defs/node" },
            },
          },
        },
        $ref: "#/$defs/node",
      }
      expect(() => JsonSchemaZ.parse(schema)).not.toThrow()
    })

    it("should handle large schemas efficiently", () => {
      const largeSchema = {
        type: "object",
        properties: Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`field${i}`, { type: "string" }])),
      }
      expect(() => JsonSchemaZ.parse(largeSchema)).not.toThrow()
    })

    it("should validate deeply nested schemas", () => {
      let schema: any = { type: "string" }
      for (let i = 0; i < 10; i++) {
        schema = {
          type: "object",
          properties: { nested: schema },
        }
      }
      expect(() => JsonSchemaZ.parse(schema)).not.toThrow()
    })

    it("should handle schema with special characters in property names", () => {
      const schema = {
        type: "object",
        properties: {
          "property-with-dashes": { type: "string" },
          "property.with.dots": { type: "number" },
          property$with$special: { type: "boolean" },
        },
      }
      expect(() => JsonSchemaZ.parse(schema)).not.toThrow()
    })

    it("should validate schema with numeric property names", () => {
      const schema = {
        type: "object",
        properties: {
          "123": { type: "string" },
          "456": { type: "number" },
        },
      }
      expect(() => JsonSchemaZ.parse(schema)).not.toThrow()
    })
  })
})
