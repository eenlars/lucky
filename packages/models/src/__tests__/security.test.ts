/**
 * Security tests for model registry
 * Focus on critical vulnerabilities: privilege escalation, injection, type confusion, resource exhaustion
 */

import { beforeAll, describe, expect, it, vi } from "vitest"
import { MOCK_CATALOG } from "./fixtures/mock-catalog"

vi.mock("../llm-catalog/catalog", () => ({
  MODEL_CATALOG: MOCK_CATALOG,
}))

import { createLLMRegistry } from "../llm-registry"

describe("Security - Privilege Escalation", () => {
  let registry: ReturnType<typeof createLLMRegistry>

  beforeAll(() => {
    registry = createLLMRegistry({
      fallbackKeys: {
        "openai-api": "sk-company-fallback",
        "groq-api": "gsk-company-fallback",
      },
    })
  })

  it("prevents BYOK users from accessing fallback keys via empty apiKeys", () => {
    expect(() =>
      registry.forUser({
        mode: "byok",
        userId: "attacker",
        models: ["gpt-4o-mini"],
        apiKeys: {},
      }),
    ).toThrow("BYOK mode requires apiKeys")
  })

  it("prevents allowlist bypass via case manipulation", () => {
    const userModels = registry.forUser({
      mode: "byok",
      userId: "user",
      models: ["gpt-4o-mini"],
      apiKeys: { "openai-api": "sk-key" },
    })

    // Exact match is allowed
    expect(() => userModels.model("gpt-4o-mini")).not.toThrow()
    // Case-manipulated variant should not be allowed
    expect(() => userModels.model("GPT-4O-MINI")).toThrow()
  })

  it("prevents array mutation via Object.freeze", () => {
    const userModels = registry.forUser({
      mode: "byok",
      userId: "user",
      models: ["gpt-4o-mini"],
      apiKeys: { "openai-api": "sk-key" },
    })

    expect(() => {
      ;(userModels as any).allowedModels.push("gpt-4o")
    }).toThrow(TypeError)
  })

  it("prevents tier selection from bypassing allowlist", () => {
    const userModels = registry.forUser({
      mode: "byok",
      userId: "user",
      models: ["gpt-4o-mini"],
      apiKeys: { "openai-api": "sk-key" },
    })

    const cheap = userModels.tier("cheap")
    const smart = userModels.tier("smart")

    expect((cheap as any).modelId).toBe("gpt-4o-mini")
    expect((smart as any).modelId).toBe("gpt-4o-mini")
  })

  it("prevents prototype pollution via __proto__", () => {
    const maliciousConfig: any = {
      mode: "byok",
      userId: "attacker",
      models: ["gpt-4o-mini"],
      apiKeys: { "openai-api": "sk-key" },
      __proto__: { polluted: true },
    }

    registry.forUser(maliciousConfig)
    expect((Object.prototype as any).polluted).toBeUndefined()
  })
})

describe("Security - Injection Attacks", () => {
  let registry: ReturnType<typeof createLLMRegistry>

  beforeAll(() => {
    registry = createLLMRegistry({
      fallbackKeys: { "openai-api": "sk-fallback" },
    })
  })

  it("treats userId as opaque string (SQL injection safe)", () => {
    const sqlPayload = "admin'; DROP TABLE users--"

    const userModels = registry.forUser({
      mode: "byok",
      userId: sqlPayload,
      models: ["gpt-4o-mini"],
      apiKeys: { "openai-api": "sk-key" },
    })

    expect(userModels).toBeDefined()
  })

  it("prevents template injection in model IDs", () => {
    const userModels = registry.forUser({
      mode: "byok",
      userId: "user",
      models: ["gpt-4o-mini"],
      apiKeys: { "openai-api": "sk-key" },
    })

    const templates = ["{{7*7}}", "${7*7}", "<%= 7*7 %>"]

    for (const payload of templates) {
      expect(() => userModels.model(payload)).toThrow()
    }
  })

  it("prevents SSRF via model IDs", () => {
    const userModels = registry.forUser({
      mode: "byok",
      userId: "user",
      models: ["gpt-4o-mini"],
      apiKeys: { "openai-api": "sk-key" },
    })

    const ssrfPayloads = [
      "http://169.254.169.254/latest/meta-data/",
      "http://localhost:8080/admin",
      "file:///etc/passwd",
    ]

    for (const payload of ssrfPayloads) {
      expect(() => userModels.model(payload)).toThrow()
    }
  })
})

describe("Security - Type Confusion", () => {
  let registry: ReturnType<typeof createLLMRegistry>

  beforeAll(() => {
    registry = createLLMRegistry({
      fallbackKeys: { "openai-api": "sk-fallback" },
    })
  })

  it("rejects array-like objects for models param", () => {
    const arrayLike: any = {
      0: "gpt-4o-mini",
      length: 1,
    }

    expect(() =>
      registry.forUser({
        mode: "byok",
        userId: "user",
        models: arrayLike,
        apiKeys: { "openai-api": "sk-key" },
      }),
    ).toThrow("models must be an array")
  })

  it("rejects non-string model IDs", () => {
    const malicious: any = [42, null, undefined, { toString: () => "model" }]

    expect(() =>
      registry.forUser({
        mode: "byok",
        userId: "user",
        models: malicious,
        apiKeys: { "openai-api": "sk-key" },
      }),
    ).toThrow()
  })

  it("rejects non-string userId", () => {
    const malicious: any = {
      toString: () => "user",
      valueOf: () => {
        throw new Error("valueOf called")
      },
    }

    expect(() =>
      registry.forUser({
        mode: "byok",
        userId: malicious,
        models: ["gpt-4o-mini"],
        apiKeys: { "openai-api": "sk-key" },
      }),
    ).toThrow("userId must be a string")
  })
})

describe("Security - Data Leakage", () => {
  let registry: ReturnType<typeof createLLMRegistry>

  beforeAll(() => {
    registry = createLLMRegistry({
      fallbackKeys: { "openai-api": "sk-company-secret" },
    })
  })

  it("does not leak API keys in error messages", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "user",
      models: ["gpt-4o-mini"],
    })

    try {
      userModels.model("invalid-model")
    } catch (error) {
      const errorMsg = String(error)
      expect(errorMsg).not.toContain("sk-company-secret")
    }
  })

  it("does not leak API keys in model.toString()", () => {
    const userModels = registry.forUser({
      mode: "byok",
      userId: "user",
      models: ["gpt-4o-mini"],
      apiKeys: { "openai-api": "sk-secret-123" },
    })

    const model = userModels.model("gpt-4o-mini")
    const str = String(model)

    expect(str).not.toContain("sk-secret-123")
  })

  it("getCatalog() does not expose gateway instances", () => {
    const userModels = registry.forUser({
      mode: "byok",
      userId: "user",
      models: ["gpt-4o-mini"],
      apiKeys: { "openai-api": "sk-key" },
    })

    const catalog = userModels.getCatalog()

    for (const entry of catalog) {
      expect((entry as any).gateway).toBeDefined()
      expect((entry as any).apiKey).toBeUndefined()
      expect((entry as any).client).toBeUndefined()
    }
  })
})

describe("Security - Resource Exhaustion", () => {
  let registry: ReturnType<typeof createLLMRegistry>

  beforeAll(() => {
    registry = createLLMRegistry({
      fallbackKeys: { "openai-api": "sk-fallback" },
    })
  })

  it("limits model count to 100", () => {
    const maxModels = Array.from({ length: 101 }, (_, i) => `model-${i}`)

    expect(() =>
      registry.forUser({
        mode: "byok",
        userId: "user",
        models: maxModels,
        apiKeys: { "openai-api": "sk-key" },
      }),
    ).toThrow("Too many models")
  })

  it("limits API key count to 50", () => {
    const maxKeys: Record<string, string> = {}
    for (let i = 0; i < 51; i++) {
      maxKeys[`provider${i}`] = `sk-key-${i}`
    }

    expect(() =>
      registry.forUser({
        mode: "byok",
        userId: "user",
        models: ["gpt-4o-mini"],
        apiKeys: maxKeys,
      }),
    ).toThrow("Too many API keys")
  })

  it("limits model ID length to 200 chars", () => {
    const tooLong = `${"x".repeat(201)}`

    expect(() =>
      registry.forUser({
        mode: "byok",
        userId: "user",
        models: [tooLong],
        apiKeys: { "openai-api": "sk-key" },
      }),
    ).toThrow("Model ID too long")
  })

  it("limits API key length to 500 chars", () => {
    const tooLong = `sk-${"x".repeat(498)}`

    expect(() =>
      registry.forUser({
        mode: "byok",
        userId: "user",
        models: ["gpt-4o-mini"],
        apiKeys: { "openai-api": tooLong },
      }),
    ).toThrow("API key too long")
  })

  it("handles deep tier() calls without stack overflow", () => {
    const userModels = registry.forUser({
      mode: "byok",
      userId: "user",
      models: ["gpt-4o-mini"],
      apiKeys: { "openai-api": "sk-key" },
    })

    expect(() => {
      for (let i = 0; i < 10000; i++) {
        userModels.tier("cheap")
      }
    }).not.toThrow()
  })
})

describe("Security - Business Logic", () => {
  let registry: ReturnType<typeof createLLMRegistry>

  beforeAll(() => {
    registry = createLLMRegistry({
      fallbackKeys: { "openai-api": "sk-fallback" },
    })
  })

  it("rejects whitespace-only API keys", () => {
    expect(() =>
      registry.forUser({
        mode: "byok",
        userId: "user",
        models: ["gpt-4o-mini"],
        apiKeys: { "openai-api": "   " },
      }),
    ).toThrow("BYOK mode requires apiKeys")
  })

  it("rejects malformed model IDs (missing gateway)", () => {
    const userModels = registry.forUser({
      mode: "byok",
      userId: "user",
      models: ["gpt-4o-mini"],
      apiKeys: { "openai-api": "sk-key" },
    })

    expect(() => userModels.model("")).toThrow()
    expect(() => userModels.model("#gpt-4o")).toThrow()
    expect(() => userModels.model("#")).toThrow()
  })

  it("rejects control characters in API keys", () => {
    const controlChars = ["sk-key\x00null", "sk-key\nnewline", "sk-key\ttab"]

    for (const key of controlChars) {
      expect(() =>
        registry.forUser({
          mode: "byok",
          userId: "user",
          models: ["gpt-4o-mini"],
          apiKeys: { "openai-api": key },
        }),
      ).toThrow("ASCII-only")
    }
  })
})

describe("Security - Race Conditions", () => {
  let registry: ReturnType<typeof createLLMRegistry>

  beforeAll(() => {
    registry = createLLMRegistry({
      fallbackKeys: { "openai-api": "sk-fallback" },
    })
  })

  it("concurrent user creation is safe", async () => {
    const promises = Array.from({ length: 100 }, (_, i) =>
      Promise.resolve(
        registry.forUser({
          mode: "byok",
          userId: `user-${i}`,
          models: ["gpt-4o-mini"],
          apiKeys: { "openai-api": `sk-key-${i}` },
        }),
      ),
    )

    const users = await Promise.all(promises)
    expect(users.length).toBe(100)
  })

  it("catalog mutations are isolated between users", () => {
    const user1 = registry.forUser({
      mode: "byok",
      userId: "user1",
      models: ["gpt-4o-mini"],
      apiKeys: { "openai-api": "sk-key" },
    })

    const user2 = registry.forUser({
      mode: "byok",
      userId: "user2",
      models: ["gpt-4o-mini"],
      apiKeys: { "openai-api": "sk-key" },
    })

    const cat1 = user1.getCatalog()
    cat1[0].input = 999999

    const cat2 = user2.getCatalog()
    expect(cat2[0].input).not.toBe(999999)
  })
})

describe("Security - Edge Case Configurations", () => {
  let registry: ReturnType<typeof createLLMRegistry>

  beforeAll(() => {
    registry = createLLMRegistry({
      fallbackKeys: { "openai-api": "sk-fallback", "groq-api": "gsk-fallback" },
    })
  })

  it("allowlist with duplicates and whitespace still enforces boundaries", () => {
    const user = registry.forUser({
      mode: "shared",
      userId: "u",
      models: [
        "gpt-4o-mini",
        "gpt-4o-mini", // Duplicate
        " gpt-4o-mini ", // Whitespace
      ],
    })

    // Asking for different model should fail
    expect(() => user.model("gpt-4o")).toThrow("not in user's allowed models")

    // Valid model still works
    expect(() => user.model("gpt-4o-mini")).not.toThrow()
  })

  it("unprefixed name not in allowlist fails even if in catalog", () => {
    const user = registry.forUser({
      mode: "shared",
      userId: "u",
      models: ["llama-3.1-8b-instant"],
    })

    // Catalog has gpt-4o-mini, but allowlist doesn't
    expect(() => user.model("gpt-4o-mini")).toThrow("not in user's allowed models")
  })

  it("switching modes doesn't grant access across allowlists", () => {
    const shared = registry.forUser({
      mode: "shared",
      userId: "s",
      models: ["gpt-4o-mini"],
    })
    const byok = registry.forUser({
      mode: "byok",
      userId: "b",
      models: ["gpt-4o"],
      apiKeys: { "openai-api": "sk-user" },
    })

    expect(() => shared.model("gpt-4o-mini")).not.toThrow()
    expect(() => shared.model("gpt-4o")).toThrow("not in user's allowed models")

    expect(() => byok.model("gpt-4o")).not.toThrow()
    expect(() => byok.model("gpt-4o-mini")).toThrow("not in user's allowed models")
  })
})
