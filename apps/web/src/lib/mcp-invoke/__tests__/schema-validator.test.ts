import type { JsonSchemaDefinition } from "@lucky/contracts/workflow"
import { describe, expect, it } from "vitest"
import { createSchemaValidationError, formatValidationErrors, validateAgainstSchema } from "../schema-validator"

describe("Schema Validator", () => {
  describe("validateAgainstSchema", () => {
    it("should validate string input against string schema", () => {
      const schema: JsonSchemaDefinition = {
        type: "string",
      }
      const result = validateAgainstSchema("hello", schema)
      expect(result.valid).toBe(true)
      expect(result.errors).toBeUndefined()
    })

    it("should validate object input against object schema", () => {
      const schema: JsonSchemaDefinition = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
        required: ["name"],
      }
      const result = validateAgainstSchema({ name: "John", age: 30 }, schema)
      expect(result.valid).toBe(true)
    })

    it("should fail validation when required field is missing", () => {
      const schema: JsonSchemaDefinition = {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" },
        },
        required: ["name", "email"],
      }
      const result = validateAgainstSchema({ name: "John" }, schema)
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
      expect(result.errorMessage).toContain("email")
    })

    it("should fail validation when type is incorrect", () => {
      const schema: JsonSchemaDefinition = {
        type: "object",
        properties: {
          age: { type: "number" },
        },
      }
      const result = validateAgainstSchema({ age: "not a number" }, schema)
      expect(result.valid).toBe(false)
      expect(result.errorMessage).toContain("number")
    })

    it("should validate array schema", () => {
      const schema: JsonSchemaDefinition = {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "number" },
            name: { type: "string" },
          },
          required: ["id"],
        },
      }
      const result = validateAgainstSchema(
        [
          { id: 1, name: "first" },
          { id: 2, name: "second" },
        ],
        schema,
      )
      expect(result.valid).toBe(true)
    })

    it("should fail when array items don't match schema", () => {
      const schema: JsonSchemaDefinition = {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "number" },
          },
          required: ["id"],
        },
      }
      const result = validateAgainstSchema([{ id: 1 }, { name: "missing id" }], schema)
      expect(result.valid).toBe(false)
    })

    it("should handle nested object validation", () => {
      const schema: JsonSchemaDefinition = {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              profile: {
                type: "object",
                properties: {
                  email: { type: "string" },
                },
                required: ["email"],
              },
            },
          },
        },
      }
      const result = validateAgainstSchema(
        {
          user: {
            profile: {
              email: "test@example.com",
            },
          },
        },
        schema,
      )
      expect(result.valid).toBe(true)
    })

    it("should handle schema compilation errors gracefully", () => {
      const invalidSchema = {
        type: "invalid-type" as any,
      }
      const result = validateAgainstSchema("test", invalidSchema)
      expect(result.valid).toBe(false)
      expect(result.errorMessage).toBeDefined()
    })
  })

  describe("formatValidationErrors", () => {
    it("should format empty errors array", () => {
      const message = formatValidationErrors([])
      expect(message).toBe("Invalid input")
    })

    it("should format single error", () => {
      const errors = [
        {
          instancePath: "/name",
          message: "is required",
          keyword: "required",
          params: { missingProperty: "name" },
          schemaPath: "#/required",
        },
      ]
      const message = formatValidationErrors(errors)
      expect(message).toContain("/name")
      expect(message).toContain("is required")
    })

    it("should format multiple errors with semicolons", () => {
      const errors = [
        {
          instancePath: "/name",
          message: "is required",
          keyword: "required",
          params: {},
          schemaPath: "#/required",
        },
        {
          instancePath: "/age",
          message: "must be number",
          keyword: "type",
          params: { type: "number" },
          schemaPath: "#/properties/age/type",
        },
      ]
      const message = formatValidationErrors(errors)
      expect(message).toContain("/name is required")
      expect(message).toContain("/age must be number")
      expect(message).toContain(";")
    })
  })

  describe("createSchemaValidationError", () => {
    it("should create properly formatted JSON-RPC error", () => {
      const requestId = "test_req_123"
      const validationResult = {
        valid: false,
        errors: [
          {
            instancePath: "/email",
            message: 'must match format "email"',
            keyword: "format",
            params: { format: "email" },
            schemaPath: "#/properties/email/format",
          },
        ],
        errorMessage: '/email must match format "email"',
      }

      const error = createSchemaValidationError(requestId, validationResult)

      expect(error.jsonrpc).toBe("2.0")
      expect(error.id).toBe(requestId)
      expect(error.error.code).toBe(-32002)
      expect(error.error.message).toBe("Input validation failed")
      expect(error.error.data).toBeDefined()
      expect(error.error.data.errors).toHaveLength(1)
      expect(error.error.data.summary).toContain("/email")
    })

    it("should handle validation result without errors array", () => {
      const requestId = 456
      const validationResult = {
        valid: false,
        errorMessage: "Schema compilation failed",
      }

      const error = createSchemaValidationError(requestId, validationResult)

      expect(error.id).toBe(456)
      expect(error.error.data.summary).toBe("Schema compilation failed")
      expect(error.error.data.errors).toEqual([])
    })
  })
})
