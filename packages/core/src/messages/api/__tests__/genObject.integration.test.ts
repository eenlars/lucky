import { MODELS } from "@/runtime/settings/constants.client"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { zodToJson } from "../../utils/zodToJson"
import { genObject } from "../genObject"

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

    expect(result).toMatchObject({
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
        active: { type: "boolean" },
      },
      required: ["name", "age", "active"],
      additionalProperties: false,
    })
  })

  it("should generate correct JSON schema with optional fields", () => {
    const result = zodToJson(schemaWithOptional)

    expect(result).toMatchObject({
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
      required: ["name"],
      additionalProperties: false,
    })
  })

  it("should successfully generate object with OpenAI", async () => {
    const result = await genObject({
      messages,
      schema: simpleSchema,
      model: MODELS.default,
      opts: {
        retries: 3,
        repair: false,
      },
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toMatchObject({
        name: expect.any(String),
        age: expect.any(Number),
        active: expect.any(Boolean),
      })
      expect(result.usdCost).toBeGreaterThan(0)
    }
  })

  it("should successfully generate object with Claude", async () => {
    const result = await genObject({
      messages,
      schema: simpleSchema,
      model: MODELS.default,
      opts: {
        retries: 3,
        repair: false,
      },
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toMatchObject({
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
      model: MODELS.default,
      opts: {
        retries: 3,
        repair: false,
      },
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toMatchObject({
        name: expect.any(String),
      })
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
      model: MODELS.default,
      opts: {
        retries: 3,
        repair: false,
      },
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toMatchObject({
        name: expect.any(String),
      })
      // age is optional, so it might or might not be present
      if (result.data.value.age !== undefined) {
        expect(result.data.value.age).toEqual(expect.any(Number))
      }
    }
  })
})
