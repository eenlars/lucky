import {
  type ExecutionSchema,
  type SecretResolver,
  getExecutionContext,
  withExecutionContext,
} from "@core/context/executionContext"
import { getModelsInstance } from "@core/models/models-instance"
import { describe, expect, it } from "vitest"

function makeNullSecrets(): SecretResolver {
  return {
    async get() {
      return undefined
    },
    async getAll() {
      return {}
    },
  }
}

describe("buildProviderConfig / getModelsInstance", () => {
  it("configures OpenAI from process.env when no execution context", async () => {
    const models = await getModelsInstance()
    const openai = models.getProviderConfig("openai")

    expect(openai).toBeDefined()
    expect(openai?.id).toBe("openai")
    expect(openai?.enabled).not.toBe(false)
    expect(openai?.apiKey).toBe(process.env.OPENAI_API_KEY)

    // Disabled providers should not be present
    const openrouter = models.getProviderConfig("openrouter")
    expect(openrouter).toBeUndefined()
  })

  it("session auth without user secret does NOT fall back to env; uses test-key in test mode", async () => {
    const values: ExecutionSchema = {
      principal: { clerk_id: "u1", scopes: [], auth_method: "session" },
      secrets: makeNullSecrets(),
    }

    const models = await withExecutionContext(values, async () => getModelsInstance())
    const openai = models.getProviderConfig("openai")

    expect(openai).toBeDefined()
    expect(openai?.id).toBe("openai")
    // In test runs, missing keys should fall back to "test-key"
    expect(openai?.apiKey).toBe("test-key")
  })

  it("api_key auth without user secret falls back to server env", async () => {
    const values: ExecutionSchema = {
      principal: { clerk_id: "u2", scopes: [], auth_method: "api_key" },
      secrets: makeNullSecrets(),
    }

    const models = await withExecutionContext(values, async () => getModelsInstance())
    const openai = models.getProviderConfig("openai")

    expect(openai).toBeDefined()
    expect(openai?.apiKey).toBe(process.env.OPENAI_API_KEY)
  })

  it("prefetched apiKeys in execution context take precedence", async () => {
    const prefetched = "prefetch-123"
    const values: ExecutionSchema = {
      principal: { clerk_id: "u3", scopes: [], auth_method: "api_key" },
      secrets: makeNullSecrets(),
      apiKeys: { OPENAI_API_KEY: prefetched },
    }

    const models = await withExecutionContext(values, async () => getModelsInstance())
    const openai = models.getProviderConfig("openai")

    expect(openai).toBeDefined()
    expect(openai?.apiKey).toBe(prefetched)
  })

  it("providerConfig is cached in runtime context and reused", async () => {
    const values: ExecutionSchema = {
      principal: { clerk_id: "u4", scopes: [], auth_method: "api_key" },
      secrets: makeNullSecrets(),
      apiKeys: { OPENAI_API_KEY: "test-api-key" },
    }

    await withExecutionContext(values, async () => {
      // First call should build and cache
      const models1 = await getModelsInstance()
      const openai1 = models1.getProviderConfig("openai")
      expect(openai1).toBeDefined()

      // Runtime context should now have the cached providerConfig
      const ctx = getExecutionContext()!
      expect(ctx.has("providerConfig")).toBe(true)
      const cached = ctx.get("providerConfig") as any
      expect(cached).toBeDefined()
      expect(cached.openai).toBeDefined()
      expect(cached.openai.apiKey).toBe("test-api-key")

      // Second call should use cached config
      const models2 = await getModelsInstance()
      const openai2 = models2.getProviderConfig("openai")
      expect(openai2).toBeDefined()
      expect(openai2?.apiKey).toBe("test-api-key")

      // Both should reference the same cached object
      expect(openai1).toEqual(openai2)
    })
  })
})
