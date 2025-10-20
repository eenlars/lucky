import { beforeEach, describe, expect, it, vi } from "vitest"
import { getAllAvailableModels, resolveAvailableModels } from "../lib/llm/model-resolver"

describe("resolveAvailableModels", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should use requested models when user has them enabled", () => {
    const required = new Map([["openai", ["gpt-4o", "gpt-4"]]])
    const enabled = new Map([["openai", ["gpt-4o", "gpt-4", "gpt-3.5-turbo"]]])

    const result = resolveAvailableModels(required, enabled)

    expect(result.gateways).toEqual(new Set(["openai"]))
    expect(result.models.get("openai")).toEqual(["gpt-4o", "gpt-4"])
    expect(result.fallbacksUsed.size).toBe(0)
  })

  it("should fallback to enabled models when requested models are not available", () => {
    const required = new Map([["openai", ["gpt-4o", "gpt-4"]]])
    const enabled = new Map([["openai", ["gpt-3.5-turbo", "gpt-4o-mini"]]])

    const result = resolveAvailableModels(required, enabled)

    expect(result.gateways).toEqual(new Set(["openai"]))
    expect(result.models.get("openai")).toEqual(["gpt-3.5-turbo", "gpt-4o-mini"])
    expect(result.fallbacksUsed.size).toBe(1)
    expect(result.fallbacksUsed.get("openai")).toEqual({
      requested: ["gpt-4o", "gpt-4"],
      used: ["gpt-3.5-turbo", "gpt-4o-mini"],
    })
  })

  it("should use partial intersection when some requested models are available", () => {
    const required = new Map([["openai", ["gpt-4o", "gpt-4", "gpt-3.5-turbo"]]])
    const enabled = new Map([["openai", ["gpt-4o", "gpt-4o-mini"]]])

    const result = resolveAvailableModels(required, enabled)

    expect(result.gateways).toEqual(new Set(["openai"]))
    expect(result.models.get("openai")).toEqual(["gpt-4o"])
    expect(result.fallbacksUsed.size).toBe(0)
  })

  it("should skip provider when no enabled models are available", () => {
    const required = new Map([
      ["openai", ["gpt-4o"]],
      ["groq", ["llama-3.1-8b"]],
    ])
    const enabled = new Map([["openai", ["gpt-4o"]]])

    const result = resolveAvailableModels(required, enabled)

    expect(result.gateways).toEqual(new Set(["openai"]))
    expect(result.models.get("openai")).toEqual(["gpt-4o"])
    expect(result.models.has("groq")).toBe(false)
  })

  it("should handle multiple providers with mixed resolution strategies", () => {
    const required = new Map([
      ["openai", ["gpt-4o"]],
      ["groq", ["llama-3.1-70b"]],
      ["anthropic", ["claude-3-opus"]],
    ])
    const enabled = new Map([
      ["openai", ["gpt-4o", "gpt-3.5-turbo"]],
      ["groq", ["llama-3.1-8b"]],
      ["anthropic", ["claude-3-opus", "claude-3-sonnet"]],
    ])

    const result = resolveAvailableModels(required, enabled)

    expect(result.gateways).toEqual(new Set(["openai", "groq", "anthropic"]))
    expect(result.models.get("openai")).toEqual(["gpt-4o"])
    expect(result.models.get("groq")).toEqual(["llama-3.1-8b"])
    expect(result.models.get("anthropic")).toEqual(["claude-3-opus"])
    expect(result.fallbacksUsed.size).toBe(1)
    expect(result.fallbacksUsed.get("groq")).toEqual({
      requested: ["llama-3.1-70b"],
      used: ["llama-3.1-8b"],
    })
  })

  it("should handle empty required models map", () => {
    const required = new Map()
    const enabled = new Map([["openai", ["gpt-4o"]]])

    const result = resolveAvailableModels(required, enabled)

    expect(result.gateways.size).toBe(0)
    expect(result.models.size).toBe(0)
    expect(result.fallbacksUsed.size).toBe(0)
  })

  it("should handle provider with empty enabled models array", () => {
    const required = new Map([["openai", ["gpt-4o"]]])
    const enabled = new Map([["openai", []]])

    const result = resolveAvailableModels(required, enabled)

    expect(result.gateways.size).toBe(0)
    expect(result.models.size).toBe(0)
  })

  it("should handle provider not in enabled models map", () => {
    const required = new Map([["openai", ["gpt-4o"]]])
    const enabled = new Map([["groq", ["llama-3.1-8b"]]])

    const result = resolveAvailableModels(required, enabled)

    expect(result.gateways.size).toBe(0)
    expect(result.models.size).toBe(0)
  })
})

describe("getAllAvailableModels", () => {
  it("should return all providers with enabled models", () => {
    const enabled = new Map([
      ["openai", ["gpt-4o", "gpt-3.5-turbo"]],
      ["groq", ["llama-3.1-8b"]],
      ["anthropic", ["claude-3-opus"]],
    ])

    const result = getAllAvailableModels(enabled)

    expect(result.gateways).toEqual(new Set(["openai", "groq", "anthropic"]))
    expect(result.models.get("openai")).toEqual(["gpt-4o", "gpt-3.5-turbo"])
    expect(result.models.get("groq")).toEqual(["llama-3.1-8b"])
    expect(result.models.get("anthropic")).toEqual(["claude-3-opus"])
    expect(result.fallbacksUsed.size).toBe(0)
  })

  it("should filter out providers with empty model lists", () => {
    const enabled = new Map([
      ["openai", ["gpt-4o"]],
      ["groq", []],
      ["anthropic", ["claude-3-opus"]],
    ])

    const result = getAllAvailableModels(enabled)

    expect(result.gateways).toEqual(new Set(["openai", "anthropic"]))
    expect(result.models.get("openai")).toEqual(["gpt-4o"])
    expect(result.models.get("anthropic")).toEqual(["claude-3-opus"])
    expect(result.models.has("groq")).toBe(false)
  })

  it("should handle empty enabled models map", () => {
    const enabled = new Map()

    const result = getAllAvailableModels(enabled)

    expect(result.gateways.size).toBe(0)
    expect(result.models.size).toBe(0)
    expect(result.fallbacksUsed.size).toBe(0)
  })

  it("should handle single provider", () => {
    const enabled = new Map([["openai", ["gpt-4o"]]])

    const result = getAllAvailableModels(enabled)

    expect(result.gateways).toEqual(new Set(["openai"]))
    expect(result.models.get("openai")).toEqual(["gpt-4o"])
  })
})
