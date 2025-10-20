import type { JsonSchemaDefinition } from "@lucky/shared/contracts/workflow"
import { describe, expect, it } from "vitest"
import { SchemaValidationError, validateWorkflowInputSchema } from "../lib/validation/input-schema-validator"

describe("validateWorkflowInputSchema", () => {
  it("should validate when input matches schema", () => {
    const schema: JsonSchemaDefinition = {
      type: "object",
      properties: {
        question: { type: "string" },
      },
      required: ["question"],
    }

    const input = { question: "What is AI?" }

    expect(() => validateWorkflowInputSchema(input, schema)).not.toThrow()
  })

  it("should skip validation when no schema is provided", () => {
    const input = { anything: "goes" }

    expect(() => validateWorkflowInputSchema(input, undefined)).not.toThrow()
  })

  it("should throw SchemaValidationError when validation fails", () => {
    const schema: JsonSchemaDefinition = {
      type: "object",
      properties: {
        question: { type: "string" },
      },
      required: ["question"],
    }

    const input = { wrong: "field" }

    expect(() => validateWorkflowInputSchema(input, schema)).toThrow(SchemaValidationError)
  })

  it("should include error details in SchemaValidationError", () => {
    const schema: JsonSchemaDefinition = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
      required: ["name", "age"],
    }

    const input = { name: "John" }

    try {
      validateWorkflowInputSchema(input, schema)
      expect.fail("Should have thrown SchemaValidationError")
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError)
      if (error instanceof SchemaValidationError) {
        expect(error.name).toBe("SchemaValidationError")
        expect(error.errorMessage).toBeDefined()
        expect(error.details).toBeDefined()
        expect(Array.isArray(error.details)).toBe(true)
        expect(error.details.length).toBeGreaterThan(0)
      }
    }
  })

  it("should validate complex nested schemas", () => {
    const schema: JsonSchemaDefinition = {
      type: "object",
      properties: {
        user: {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string" },
          },
          required: ["name"],
        },
      },
      required: ["user"],
    }

    const validInput = {
      user: {
        name: "John",
        email: "john@example.com",
      },
    }

    expect(() => validateWorkflowInputSchema(validInput, schema)).not.toThrow()
  })

  it("should reject invalid nested data", () => {
    const schema: JsonSchemaDefinition = {
      type: "object",
      properties: {
        user: {
          type: "object",
          properties: {
            name: { type: "string" },
          },
          required: ["name"],
        },
      },
      required: ["user"],
    }

    const invalidInput = {
      user: {
        email: "john@example.com",
      },
    }

    expect(() => validateWorkflowInputSchema(invalidInput, schema)).toThrow(SchemaValidationError)
  })

  it("should validate array schemas", () => {
    const schema: JsonSchemaDefinition = {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: { type: "string" },
        },
      },
    }

    const validInput = {
      items: ["apple", "banana", "cherry"],
    }

    expect(() => validateWorkflowInputSchema(validInput, schema)).not.toThrow()
  })

  it("should reject invalid array items", () => {
    const schema: JsonSchemaDefinition = {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: { type: "number" },
        },
      },
    }

    const invalidInput = {
      items: [1, 2, "three"],
    }

    expect(() => validateWorkflowInputSchema(invalidInput, schema)).toThrow(SchemaValidationError)
  })

  it("should validate with type mismatch", () => {
    const schema: JsonSchemaDefinition = {
      type: "object",
      properties: {
        age: { type: "number" },
      },
    }

    const invalidInput = {
      age: "thirty",
    }

    expect(() => validateWorkflowInputSchema(invalidInput, schema)).toThrow(SchemaValidationError)
  })

  it("should handle error details with path and message", () => {
    const schema: JsonSchemaDefinition = {
      type: "object",
      properties: {
        email: { type: "string", pattern: "^.+@.+\\..+$" },
      },
      required: ["email"],
    }

    const invalidInput = {
      email: "not-an-email",
    }

    try {
      validateWorkflowInputSchema(invalidInput, schema)
      expect.fail("Should have thrown")
    } catch (error) {
      if (error instanceof SchemaValidationError) {
        expect(error.details.some(d => d.path.includes("email"))).toBe(true)
        expect(error.details.some(d => d.message)).toBe(true)
      }
    }
  })
})

describe("SchemaValidationError", () => {
  it("should create error with correct properties", () => {
    const errorMessage = "Validation failed"
    const details = [
      { path: "/name", message: "is required" },
      { path: "/age", message: "must be number" },
    ]

    const error = new SchemaValidationError(errorMessage, details)

    expect(error.name).toBe("SchemaValidationError")
    expect(error.message).toBe(errorMessage)
    expect(error.errorMessage).toBe(errorMessage)
    expect(error.details).toEqual(details)
    expect(error).toBeInstanceOf(Error)
  })

  it("should handle empty details array", () => {
    const error = new SchemaValidationError("No details", [])

    expect(error.details).toEqual([])
  })

  it("should handle details with params", () => {
    const details = [
      {
        path: "/age",
        message: "must be >= 0",
        params: { minimum: 0 },
      },
    ]

    const error = new SchemaValidationError("Age validation failed", details)

    expect(error.details[0].params).toEqual({ minimum: 0 })
  })
})
