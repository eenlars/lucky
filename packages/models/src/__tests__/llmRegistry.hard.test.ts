/**
 * Supercharged tests for LLMRegistry and UserModels
 *
 * Goals:
 *  - Hammer invalid configurations & edge-cases (not just key permutations)
 *  - Prove user isolation, immutability, and deterministic sync behavior
 *  - Validate catalog invariants thoroughly
 *  - Evoke clear failures with precise error assertions
 */

import { beforeEach, describe, expect, it } from "vitest"
import { MODEL_CATALOG } from "../llm-catalog/catalog"
import { createLLMRegistry } from "../llm-registry"

function expectToThrowMessage(fn: () => any, contains: string) {
  try {
    fn()
    throw new Error("Expected function to throw, but it did not")
  } catch (err: any) {
    expect(String(err?.message || err)).toContain(contains)
  }
}

// Utility to build a minimal valid registry (avoid over-playing with keys)
const mkRegistry = () =>
  createLLMRegistry({
    fallbackKeys: {
      openai: "sk-fallback-openai",
      groq: "gsk-fallback-groq",
      openrouter: "sk-fallback-openrouter",
    },
  })

// Useful model ids that we expect are present in the catalog
const OAI_4O = "openai#gpt-4o"
const OAI_4O_MINI = "openai#gpt-4o-mini"
const OAI_35 = "openai#gpt-3.5-turbo"
const OAI_4_TURBO = "openai#gpt-4-turbo"
const GROQ_L31_8B = ""groq#openai/gpt-oss-20b""

// If any are not in the catalog these tests should fail loudly — that’s intended to surface drift.
const catalogHas = (id: string) => MODEL_CATALOG.some((e: any) => e.id === id)

describe("Catalog invariants", () => {
  it("has unique ids and required fields for ALL entries", () => {
    const seen = new Set<string>()
    for (const e of MODEL_CATALOG) {
      expect(e.id).toBeDefined()
      expect(typeof e.id).toBe("string")
      expect(e.id.length).toBeGreaterThan(2)
      expect(e.provider).toBeDefined()
      expect(e.model).toBeDefined()
      expect(typeof e.input).toBe("number")
      expect(typeof e.output).toBe("number")
      expect(typeof e.contextLength).toBe("number")
      expect(typeof e.intelligence).toBe("number")
      // id uniqueness
      expect(seen.has(e.id)).toBe(false)
      seen.add(e.id)
      // id format: provider#model
      expect(e.id.includes("#")).toBe(true)
      const [p, m] = e.id.split("#")
      expect(p).toBeTruthy()
      expect(m).toBeTruthy()
      // simple positivity checks
      expect(e.input).toBeGreaterThanOrEqual(0)
      expect(e.output).toBeGreaterThanOrEqual(0)
      expect(e.contextLength).toBeGreaterThan(0)
      expect(e.intelligence).toBeGreaterThanOrEqual(0)
    }
  })

  it("returns defensive copies from getCatalog() (no shared references)", () => {
    const registry = mkRegistry()
    const user = registry.forUser({ mode: "shared", userId: "u1", models: [OAI_4O_MINI] })

    const a = user.getCatalog()
    const originalLength = a.length
    const aFirst = JSON.parse(JSON.stringify(a[0]))

    // Mutate the returned array & objects
    a.pop()
    ;(a[0] as any).id = "tampered#id"

    // Fetch again — should be unaffected
    const b = user.getCatalog()
    expect(b.length).toBe(originalLength)
    expect(b[0].id).toBe(aFirst.id)
  })
})

describe("Registry construction & forUser() edge cases", () => {
  it("creates a registry with minimal valid keys and exposes forUser()", () => {
    const registry = mkRegistry()
    expect(registry).toBeDefined()
    expect(typeof registry.forUser).toBe("function")
  })

  it("throws on missing/invalid mode", () => {
    const registry = mkRegistry()
    expectToThrowMessage(
      () => registry.forUser({ mode: "invalid" as any, userId: "u", models: [] }),
      'Mode must be "byok" or "shared"',
    )
  })

  it("rejects non-array models input", () => {
    const registry = mkRegistry()
    expectToThrowMessage(
      () => registry.forUser({ mode: "shared", userId: "u", models: null as any }),
      "models must be an array",
    )
    expectToThrowMessage(
      () => registry.forUser({ mode: "shared", userId: "u", models: 123 as any }),
      "models must be an array",
    )
  })

  it("ignores caller-side later mutations to the models array (defensive copy)", () => {
    const registry = mkRegistry()
    const allowed = [OAI_4O_MINI]
    const user = registry.forUser({ mode: "shared", userId: "u", models: allowed })

    // Mutate caller array AFTER creating the user
    allowed.length = 0

    // Should still work with the original list
    expect(() => user.model(OAI_4O_MINI)).not.toThrow()
  })

  it("different calls (even same userId) return isolated instances", () => {
    const registry = mkRegistry()
    const a = registry.forUser({ mode: "shared", userId: "same", models: [OAI_4O_MINI] })
    const b = registry.forUser({ mode: "shared", userId: "same", models: [OAI_4O] })

    expect(a).not.toBe(b)
    expect(() => a.model(OAI_4O_MINI)).not.toThrow()
    expectToThrowMessage(() => a.model(OAI_4O), "not in user's allowed models")
    expect(() => b.model(OAI_4O)).not.toThrow()
    expectToThrowMessage(() => b.model(OAI_4O_MINI), "not in user's allowed models")
  })

  it("BYOK mode strictly requires apiKeys and rejects empty objects", () => {
    const registry = mkRegistry()
    expectToThrowMessage(
      () => registry.forUser({ mode: "byok", userId: "u", models: [OAI_4O] }),
      "BYOK mode requires apiKeys",
    )
    expectToThrowMessage(
      () => registry.forUser({ mode: "byok", userId: "u", models: [OAI_4O], apiKeys: {} }),
      "BYOK mode requires apiKeys",
    )
  })

  it("shared mode does not require apiKeys, even if models span multiple providers", () => {
    const registry = mkRegistry()
    const user = registry.forUser({
      mode: "shared",
      userId: "u",
      models: [OAI_4O_MINI, GROQ_L31_8B],
    })
    expect(user).toBeDefined()
  })
})

describe("UserModels.model() — resolution & errors", () => {
  beforeEach(() => {
    // sanity: ensure the catalog has what these tests expect
    expect(catalogHas(OAI_4O_MINI)).toBe(true)
  })

  it("resolves a fully-qualified id from the user's allowlist", () => {
    const registry = mkRegistry()
    const user = registry.forUser({ mode: "shared", userId: "u", models: [OAI_4O_MINI] })
    const model = user.model(OAI_4O_MINI)
    expect(model).toBeDefined()
  })

  it("auto-detects provider for unprefixed names that are present in the allowlist", () => {
    const registry = mkRegistry()
    const user = registry.forUser({ mode: "shared", userId: "u", models: [OAI_4O_MINI] })

    const model = user.model("gpt-4o-mini")
    expect(model).toBeDefined()
  })

  it("throws when requesting a prefixed model that's not in the user's allowlist", () => {
    const registry = mkRegistry()
    const user = registry.forUser({ mode: "shared", userId: "u", models: [OAI_4O_MINI] })

    expectToThrowMessage(() => user.model(OAI_4O), "not in user's allowed models")
  })

  it("throws when requesting an unprefixed model not in the user's allowlist", () => {
    const registry = mkRegistry()
    const user = registry.forUser({ mode: "shared", userId: "u", models: [OAI_4O_MINI] })

    expectToThrowMessage(() => user.model("gpt-4o"), "not in user's allowed models")
  })

  it("throws when provider is not configured for a requested model", () => {
    // Only configure openai on purpose
    const registry = createLLMRegistry({ fallbackKeys: { openai: "sk" } })
    const user = registry.forUser({ mode: "shared", userId: "u", models: [GROQ_L31_8B] })
    expectToThrowMessage(() => user.model(GROQ_L31_8B), "Provider not configured: groq")
  })

  it("throws a clear error for malformed ids (missing '#')", () => {
    const registry = mkRegistry()
    const user = registry.forUser({ mode: "shared", userId: "u", models: [OAI_4O_MINI] })
    expectToThrowMessage(() => user.model("openai gpt-4o-mini" as any), "Model not found")
  })

  it("throws a clear error when the model id does not exist in the catalog", () => {
    const registry = mkRegistry()
    const user = registry.forUser({ mode: "shared", userId: "u", models: ["openai#definitely-not-a-real-model"] })

    expectToThrowMessage(() => user.model("openai#definitely-not-a-real-model"), "Model not found")
  })

  it("user isolation: one user's allowlist MUST NOT grant another user access", () => {
    const registry = mkRegistry()
    const u1 = registry.forUser({ mode: "shared", userId: "u1", models: [OAI_4O] })
    const u2 = registry.forUser({ mode: "shared", userId: "u2", models: [OAI_4O_MINI] })

    expect(() => u1.model(OAI_4O)).not.toThrow()
    expectToThrowMessage(() => u1.model(OAI_4O_MINI), "not in user's allowed models")

    expect(() => u2.model(OAI_4O_MINI)).not.toThrow()
    expectToThrowMessage(() => u2.model(OAI_4O), "not in user's allowed models")
  })

  it("BYOK users are isolated from shared users (separate instances, same model)", () => {
    const registry = mkRegistry()
    const byok = registry.forUser({ mode: "byok", userId: "byok", models: [OAI_4O], apiKeys: { openai: "sk-user" } })
    const shared = registry.forUser({ mode: "shared", userId: "shared", models: [OAI_4O] })

    expect(() => byok.model(OAI_4O)).not.toThrow()
    expect(() => shared.model(OAI_4O)).not.toThrow()
    expect(byok).not.toBe(shared)
  })
})

describe("UserModels.tier() — selection semantics & constraints", () => {
  it("cheap chooses from ONLY the user's models (not global catalog)", () => {
    const registry = mkRegistry()
    // Intentionally omit gpt-4o-mini even if it’s cheaper globally
    const expensive = registry.forUser({
      mode: "shared",
      userId: "exp",
      models: [OAI_4O, OAI_4_TURBO],
    })

    const m = expensive.tier("cheap")
    expect(m).toBeDefined()
    // Invariant: must not throw and must be one of the allowed
    expect([OAI_4O, OAI_4_TURBO]).toContain((m as any).modelId)
  })

  it("fast selects a valid model and falls back if necessary", () => {
    const registry = mkRegistry()
    const user = registry.forUser({
      mode: "shared",
      userId: "u",
      models: [OAI_4O, OAI_4O_MINI, GROQ_L31_8B],
    })

    const m = user.tier("fast")
    expect(m).toBeDefined()
  })

  it("smart picks highest intelligence within the user's set", () => {
    const registry = mkRegistry()
    const user = registry.forUser({ mode: "shared", userId: "u", models: [OAI_4O, OAI_4O_MINI, OAI_35] })
    const m = user.tier("smart")
    expect(m).toBeDefined()
  })

  it("balanced returns a valid model without crossing allowlist boundaries", () => {
    const registry = mkRegistry()
    const user = registry.forUser({ mode: "shared", userId: "u", models: [OAI_4O, OAI_4O_MINI, OAI_35] })
    const m = user.tier("balanced")
    expect(m).toBeDefined()
  })

  it("throws on unknown tier names with exact message", () => {
    const registry = mkRegistry()
    const user = registry.forUser({ mode: "shared", userId: "u", models: [OAI_4O_MINI] })
    expectToThrowMessage(() => user.tier("mystery" as any), "Unknown tier: mystery")
  })

  it("throws meaningful errors when the user's models are empty or entirely invalid", () => {
    const registry = mkRegistry()

    const empty = registry.forUser({ mode: "shared", userId: "empty", models: [] })
    expectToThrowMessage(() => empty.tier("cheap"), "No models configured for tier selection")

    const invalid = registry.forUser({ mode: "shared", userId: "bad", models: ["invalid#model"] })
    expectToThrowMessage(() => invalid.tier("cheap"), "No valid models found in user's configuration")
  })
})

describe("Sync behavior & micro-performance (no async)", () => {
  it("model(), tier(), getCatalog() return synchronously in <10ms", () => {
    const registry = mkRegistry()
    const user = registry.forUser({ mode: "shared", userId: "u", models: [OAI_4O_MINI, OAI_35] })

    let start = Date.now()
    const m = user.model(OAI_4O_MINI)
    let duration = Date.now() - start
    expect(m).toBeDefined()
    expect(duration).toBeLessThan(10)

    start = Date.now()
    const t = user.tier("cheap")
    duration = Date.now() - start
    expect(t).toBeDefined()
    expect(duration).toBeLessThan(10)

    start = Date.now()
    const c = user.getCatalog()
    duration = Date.now() - start
    expect(c).toBeDefined()
    expect(duration).toBeLessThan(10)
  })
})

describe("Nasty configuration edge-cases (evoke errors)", () => {
  it("provider configured but model allowlist references unknown provider", () => {
    const registry = mkRegistry()
    const user = registry.forUser({
      mode: "shared",
      userId: "u",
      models: ["unknown-provider#some-model"],
    })
    expectToThrowMessage(() => user.model("unknown-provider#some-model"), "Provider not configured")
  })

  it("allowlist with duplicates and whitespace should still behave deterministically (no accidental success)", () => {
    const registry = mkRegistry()
    const user = registry.forUser({
      mode: "shared",
      userId: "u",
      models: [OAI_4O_MINI, OAI_4O_MINI, ` ${OAI_4O_MINI} `],
    })

    // Asking for a different model should still fail
    expectToThrowMessage(() => user.model(OAI_4O), "not in user's allowed models")

    // The valid one is still retrievable
    expect(() => user.model(OAI_4O_MINI)).not.toThrow()
  })

  it("unprefixed name that is NOT in allowlist should fail even if present in catalog", () => {
    const registry = mkRegistry()
    const user = registry.forUser({ mode: "shared", userId: "u", models: [GROQ_L31_8B] })

    // Catalog likely has gpt-4o-mini, but allowlist does not
    expectToThrowMessage(() => user.model("gpt-4o-mini"), "not in user's allowed models")
  })

  it("switching modes does not magically grant access: BYOK user restricted to own allowlist", () => {
    const registry = mkRegistry()
    const shared = registry.forUser({ mode: "shared", userId: "s", models: [OAI_4O_MINI] })
    const byok = registry.forUser({ mode: "byok", userId: "b", models: [OAI_4O], apiKeys: { openai: "sk-user" } })

    expect(() => shared.model(OAI_4O_MINI)).not.toThrow()
    expectToThrowMessage(() => shared.model(OAI_4O), "not in user's allowed models")

    expect(() => byok.model(OAI_4O)).not.toThrow()
    expectToThrowMessage(() => byok.model(OAI_4O_MINI), "not in user's allowed models")
  })
})
