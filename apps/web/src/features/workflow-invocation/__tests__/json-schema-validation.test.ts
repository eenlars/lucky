import { ErrorCodes } from "@lucky/shared/contracts/invoke"
import type { JsonSchemaDefinition } from "@lucky/shared/contracts/workflow"
import { describe, expect, it } from "vitest"
import {
  createSchemaValidationError,
  formatValidationErrors,
  validateAgainstSchema,
} from "../lib/json-schema-validation"

describe("validateAgainstSchema", () => {
  it("should validate data that matches schema", () => {
    const schema: JsonSchemaDefinition = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
      required: ["name"],
    }

    const data = { name: "John", age: 30 }

    const result = validateAgainstSchema(data, schema)

    expect(result.valid).toBe(true)
    expect(result.errors).toBeUndefined()
    expect(result.errorMessage).toBeUndefined()
  })

  it("should reject data missing required properties", () => {
    const schema: JsonSchemaDefinition = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
      required: ["name", "age"],
    }

    const data = { name: "John" }

    const result = validateAgainstSchema(data, schema)

    expect(result.valid).toBe(false)
    expect(result.errors).toBeDefined()
    expect(result.errors?.length).toBeGreaterThan(0)
    expect(result.errorMessage).toContain("age")
  })

  it("should reject data with wrong property types", () => {
    const schema: JsonSchemaDefinition = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
    }

    const data = { name: "John", age: "thirty" }

    const result = validateAgainstSchema(data, schema)

    expect(result.valid).toBe(false)
    expect(result.errors).toBeDefined()
    expect(result.errorMessage).toContain("age")
  })

  it("should validate arrays", () => {
    const schema: JsonSchemaDefinition = {
      type: "array",
      items: { type: "string" },
    }

    const data = ["apple", "banana", "cherry"]

    const result = validateAgainstSchema(data, schema)

    expect(result.valid).toBe(true)
  })

  it("should reject arrays with wrong item types", () => {
    const schema: JsonSchemaDefinition = {
      type: "array",
      items: { type: "string" },
    }

    const data = ["apple", 123, "cherry"]

    const result = validateAgainstSchema(data, schema)

    expect(result.valid).toBe(false)
    expect(result.errors).toBeDefined()
  })

  it("should validate nested objects", () => {
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
    }

    const data = {
      user: {
        name: "John",
        email: "john@example.com",
      },
    }

    const result = validateAgainstSchema(data, schema)

    expect(result.valid).toBe(true)
  })

  it("should reject nested objects with invalid data", () => {
    const schema: JsonSchemaDefinition = {
      type: "object",
      properties: {
        user: {
          type: "object",
          properties: {
            name: { type: "string" },
            age: { type: "number" },
          },
          required: ["name"],
        },
      },
      required: ["user"],
    }

    const data = {
      user: {
        age: "thirty",
      },
    }

    const result = validateAgainstSchema(data, schema)

    expect(result.valid).toBe(false)
    expect(result.errors).toBeDefined()
  })

  it("should handle schema compilation errors gracefully", () => {
    const invalidSchema = {
      type: "invalid_type",
    }

    const data = { test: "data" }

    // @ts-expect-error - Intentionally testing invalid schema type
    const result = validateAgainstSchema(data, invalidSchema)

    expect(result.valid).toBe(false)
    expect(result.errorMessage).toBeDefined()
  })

  it("should validate with additionalProperties false", () => {
    const schema: JsonSchemaDefinition = {
      type: "object",
      properties: {
        name: { type: "string" },
      },
      additionalProperties: false,
    }

    const invalidData = { name: "John", extra: "field" }

    const result = validateAgainstSchema(invalidData, schema)

    expect(result.valid).toBe(false)
  })

  it("should validate string patterns", () => {
    const schema: JsonSchemaDefinition = {
      type: "object",
      properties: {
        email: { type: "string", pattern: "^.+@.+\\..+$" },
      },
    }

    const validData = { email: "test@example.com" }
    const invalidData = { email: "not-an-email" }

    expect(validateAgainstSchema(validData, schema).valid).toBe(true)
    expect(validateAgainstSchema(invalidData, schema).valid).toBe(false)
  })

  it("should validate numeric ranges", () => {
    const schema: JsonSchemaDefinition = {
      type: "object",
      properties: {
        age: { type: "number", minimum: 0, maximum: 120 },
      },
    }

    const validData = { age: 25 }
    const invalidData = { age: 150 }

    expect(validateAgainstSchema(validData, schema).valid).toBe(true)
    expect(validateAgainstSchema(invalidData, schema).valid).toBe(false)
  })
})

describe("formatValidationErrors", () => {
  it("should format validation errors into readable message", () => {
    const errors = [
      { instancePath: "/name", message: "is required", params: {}, schemaPath: "", keyword: "", data: {} },
      { instancePath: "/age", message: "must be number", params: {}, schemaPath: "", keyword: "", data: {} },
    ]

    const message = formatValidationErrors(errors)

    expect(message).toContain("/name is required")
    expect(message).toContain("/age must be number")
    expect(message).toContain(";")
  })

  it("should handle errors without instance path", () => {
    const errors = [{ instancePath: "", message: "must be object", params: {}, schemaPath: "", keyword: "", data: {} }]

    const message = formatValidationErrors(errors)

    expect(message).toBe("input must be object")
  })

  it("should handle errors without message", () => {
    const errors = [{ instancePath: "/field", message: undefined, params: {}, schemaPath: "", keyword: "", data: {} }]

    const message = formatValidationErrors(errors)

    expect(message).toBe("/field is invalid")
  })

  it("should return default message for empty errors array", () => {
    const message = formatValidationErrors([])

    expect(message).toBe("Invalid input")
  })

  it("should handle single error", () => {
    const errors = [
      { instancePath: "/email", message: "must match pattern", params: {}, schemaPath: "", keyword: "", data: {} },
    ]

    const message = formatValidationErrors(errors)

    expect(message).toBe("/email must match pattern")
  })
})

describe("createSchemaValidationError", () => {
  it("should create JSON-RPC error response for validation failure", () => {
    const requestId = "req_123"
    const result = {
      valid: false,
      errors: [
        {
          instancePath: "/name",
          message: "is required",
          params: { missingProperty: "name" },
          schemaPath: "",
          keyword: "required",
          data: {},
        },
      ],
      errorMessage: "data must have required property 'name'",
    }

    const response = createSchemaValidationError(requestId, result)

    expect(response).toEqual({
      jsonrpc: "2.0",
      id: requestId,
      error: {
        code: ErrorCodes.INPUT_VALIDATION_FAILED,
        message: "Input validation failed",
        data: {
          errors: [
            {
              path: "/name",
              message: "is required",
              params: { missingProperty: "name" },
            },
          ],
          summary: "data must have required property 'name'",
        },
      },
    })
  })

  it("should handle numeric request ID", () => {
    const requestId = 456
    const result = {
      valid: false,
      errors: [],
      errorMessage: "Invalid input",
    }

    const response = createSchemaValidationError(requestId, result)

    expect(response.id).toBe(456)
  })

  it("should handle result without errors array", () => {
    const requestId = "req_123"
    const result = {
      valid: false,
      errorMessage: "Schema compilation failed",
    }

    const response = createSchemaValidationError(requestId, result)

    expect(response.error.data.errors).toEqual([])
    expect(response.error.data.summary).toBe("Schema compilation failed")
  })

  it("should handle result without error message", () => {
    const requestId = "req_123"
    const result = {
      valid: false,
      errors: [
        {
          instancePath: "/field",
          message: "is invalid",
          params: {},
          schemaPath: "",
          keyword: "",
          data: {},
        },
      ],
    }

    const response = createSchemaValidationError(requestId, result)

    expect(response.error.data.summary).toBe("/field is invalid")
  })

  it("should handle multiple validation errors", () => {
    const requestId = "req_123"
    const result = {
      valid: false,
      errors: [
        {
          instancePath: "/name",
          message: "is required",
          params: {},
          schemaPath: "",
          keyword: "required",
          data: {},
        },
        {
          instancePath: "/age",
          message: "must be number",
          params: {},
          schemaPath: "",
          keyword: "type",
          data: {},
        },
      ],
      errorMessage: "Multiple validation errors",
    }

    const response = createSchemaValidationError(requestId, result)

    expect(response.error.data.errors.length).toBe(2)
    expect(response.error.data.summary).toBe("Multiple validation errors")
  })
})
