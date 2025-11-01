import { beforeEach, describe, expect, it, vi } from "vitest"

// TODO: These are integration tests making real API calls - exclude from main suite
// TODO: No tests for complex nested schemas or recursive types

// Mock the model catalog to use test fixtures (MUST be first)
vi.mock("@lucky/models/llm-catalog/catalog", async () => {
  const { MOCK_CATALOG } = await import("@lucky/models/__tests__/fixtures/mock-catalog")
  return {
    MODEL_CATALOG: MOCK_CATALOG,
  }
})

// Mock generateText to prevent actual API calls
vi.mock("ai", async () => {
  const actual = await vi.importActual("ai")
  return {
    ...actual,
    generateText: vi.fn(async () => ({
      text: `<json>
{
  "name": "John",
  "age": 25,
  "active": true
}
</json>`,
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
    })),
  }
})

import type { SecretResolver } from "@core/context/executionContext"
import { withExecutionContext } from "@core/context/executionContext"
import { zodToJson } from "@core/utils/validation/zodToJson"
import { createLLMRegistry } from "@lucky/models"
import type { Principal } from "@lucky/shared"
import { z } from "zod"
import { genObject } from "../genObject"

describe("genObject integration tests", () => {
  const testPrincipal: Principal = {
    clerk_id: "test_user_123",
    auth_method: "session",
    scopes: ["workflows:read", "workflows:execute"],
  }

  const createMockSecretResolver = (keys: Record<string, string>): SecretResolver => ({
    get: vi.fn(async (key: string, _namespace?: string) => keys[key]),
    getAll: vi.fn(async (keyNames: string[], _namespace?: string) => {
      const result: Record<string, string> = {}
      for (const keyName of keyNames) {
        if (keys[keyName]) {
          result[keyName] = keys[keyName]
        }
      }
      return result
    }),
  })

  const testApiKeys = {
    OPENAI_API_KEY: "sk-test-openai-key",
    GROQ_API_KEY: "gsk-test-groq-key",
    OPENROUTER_API_KEY: "sk-or-test-key",
  }

  let secrets: SecretResolver
  let userModels: any

  beforeEach(async () => {
    secrets = createMockSecretResolver(testApiKeys)
    const apiKeys = await secrets.getAll(
      ["OPENAI_API_KEY", "GROQ_API_KEY", "OPENROUTER_API_KEY"],
      "environment-variables",
    )

    const llmRegistry = createLLMRegistry({
      fallbackKeys: {
        "openai-api": apiKeys.OPENAI_API_KEY,
        "groq-api": apiKeys.GROQ_API_KEY,
        "openrouter-api": apiKeys.OPENROUTER_API_KEY,
      },
    })

    userModels = llmRegistry.forUser({
      mode: "shared",
      userId: testPrincipal.clerk_id,
      models: ["gpt-4o-mini", "llama-3.1-8b-instant"],
    })
  })

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
    await withExecutionContext({ principal: testPrincipal, secrets, userModels }, async () => {
      const result = await genObject({
        messages,
        schema: simpleSchema,
        model: "gpt-4o-mini",
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
  })

  // These appear to be duplicate tests
  it("should successfully generate object with Groq", async () => {
    await withExecutionContext({ principal: testPrincipal, secrets, userModels }, async () => {
      const result = await genObject({
        messages,
        schema: simpleSchema,
        model: "llama-3.1-8b-instant",
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
  })

  it("should handle optional fields correctly with OpenAI", async () => {
    await withExecutionContext({ principal: testPrincipal, secrets, userModels }, async () => {
      const result = await genObject({
        messages,
        schema: schemaWithOptional,
        model: "gpt-4o-mini",
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

  it("should handle optional fields correctly with Groq", async () => {
    await withExecutionContext({ principal: testPrincipal, secrets, userModels }, async () => {
      const result = await genObject({
        messages,
        schema: schemaWithOptional,
        model: "llama-3.1-8b-instant",
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
})
