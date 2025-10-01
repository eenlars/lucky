import { getDefaultModels } from "@core/core-config/compat"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { zodToJson } from "@core/utils/zod/zodToJson"
import { genObject } from "../genObject"

// TODO: These are integration tests making real API calls - exclude from main suite
// TODO: No tests for complex nested schemas or recursive types

describe("genObject integration tests", () => {
  const simpleSchema = z.object({
    name: z.string(),
    age: z.number(),
    active: z.boolean(),
  })

  const schemaWithOptional = z.object({
    name: z.string(),
    age: z.number().optional(),
  })

  const messages = [
    {
      role: "user" as const,
      content: "Create a person named John who is 25 years old and active",
    },
  ]

  it("should generate correct JSON schema from simple Zod schema", () => {
    const result = zodToJson(simpleSchema)

    expect(JSON.parse(result)).toMatchObject({
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
        active: { type: "boolean" },
      },
      required: ["name", "age", "active"],
    })
  })

  it("should generate correct JSON schema with optional fields", () => {
    const result = zodToJson(schemaWithOptional)

    expect(JSON.parse(result)).toMatchObject({
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
      required: ["name"],
    })
  })

  // TODO: Test name says OpenAI but uses getDefaultModels which may not be OpenAI
  it("should successfully generate object with OpenAI", async () => {
    const result = await genObject({
      messages,
      schema: simpleSchema,
      model: getDefaultModels().default,
      opts: {
        retries: 3,
        repair: false,
      },
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.value).toMatchObject({
        name: expect.any(String),
        age: expect.any(Number),
        active: expect.any(Boolean),
      })
      expect(result.usdCost).toBeGreaterThan(0)
    }
  })

  // TODO: Test name says Claude but uses same getDefaultModels as OpenAI test
  // These appear to be duplicate tests
  it("should successfully generate object with Claude", async () => {
    const result = await genObject({
      messages,
      schema: simpleSchema,
      model: getDefaultModels().default,
      opts: {
        retries: 3,
        repair: false,
      },
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.value).toMatchObject({
        name: expect.any(String),
        age: expect.any(Number),
        active: expect.any(Boolean),
      })
      expect(result.usdCost).toBeGreaterThan(0)
    }
  })

  it("should handle optional fields correctly with OpenAI", async () => {
    const result = await genObject({
      messages,
      schema: schemaWithOptional,
      model: getDefaultModels().default,
      opts: {
        retries: 3,
        repair: false,
      },
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.value).toMatchObject({
        name: expect.any(String),
      })
      // TODO: Weak assertion - should test both cases (with and without optional field)
      // age is optional, so it might or might not be present
      if (result.data.value.age !== undefined) {
        expect(result.data.value.age).toEqual(expect.any(Number))
      }
    }
  })

  it("should handle optional fields correctly with Claude", async () => {
    const result = await genObject({
      messages,
      schema: schemaWithOptional,
      model: getDefaultModels().default,
      opts: {
        retries: 3,
        repair: false,
      },
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.value).toMatchObject({
        name: expect.any(String),
      })
      // TODO: Weak assertion - should test both cases (with and without optional field)
      // age is optional, so it might or might not be present
      if (result.data.value.age !== undefined) {
        expect(result.data.value.age).toEqual(expect.any(Number))
      }
    }
  })
})
